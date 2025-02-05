export const dynamic = 'force-dynamic';

import { AnthropicClient } from '@/services/claude/client';
import { DiscordClient } from '@/services/discord/client';
import { MessageService } from '@/services/redis/messages';
import { ReportService } from '@/services/redis/reports';
import { SourceService } from '@/services/redis/sources';
import { TopicService } from '@/services/redis/topics';
import { ReportGenerator } from '@/services/report/generator';
import { ChannelQueue } from '@/services/report/queue';
import { BulkGenerationError, BulkGenerationValidator } from '@/services/report/validation';
import { ActivityThreshold, ChannelInfo } from '@/types/discord';
import { Report } from '@/types/report';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const BATCH_SIZE = 3;
const DEFAULT_THRESHOLDS: ActivityThreshold[] = [
    { timeframe: '1h', minMessages: 3 },
    { timeframe: '4h', minMessages: 6 },
    { timeframe: '24h', minMessages: 10 },
];

const encoder = new TextEncoder();

async function getLatestReport(channelId: string): Promise<Report | undefined> {
    const reportGroups = await ReportService.getAllReports();
    return reportGroups
        .flatMap((group) => group.reports)
        .filter((r) => r.channelId === channelId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
}

async function processChannel(
    channel: ChannelInfo,
    timeframe: '1h' | '4h' | '24h',
    discordClient: DiscordClient,
    reportGenerator: ReportGenerator,
    controller: ReadableStreamDefaultController,
    threshold: ActivityThreshold
) {
    const topicService = new TopicService();
    const messageService = new MessageService();
    const sourceService = new SourceService();

    try {
        // Calculate timeframe window
        const hours = timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1;
        const now = new Date();
        const timeframeStart = new Date(now.getTime() - (hours * 60 * 60 * 1000));
        const timeframeEnd = now;

        // Create topic
        const channelPrefix = channel.name.split('|')[0].replace(/[^a-zA-Z0-9-]/g, '');
        const topicId = `topic_${channelPrefix}_${uuidv4()}`;
        await topicService.create({
            id: topicId,
            name: `${channel.name}|${channel.id}-${timeframe}-${timeframeStart.toISOString()}`
        });

        // Send processing update
        controller.enqueue(encoder.encode(
            `event: progress\ndata: ${JSON.stringify({
                channelId: channel.id,
                status: 'processing'
            })}\n\n`
        ));

        // Fetch messages
        const messages = await discordClient.fetchMessagesInTimeframe(
            channel.id,
            hours,
            undefined,
            topicId
        );

        // Filter messages within timeframe
        const validMessages = messages.filter(msg => {
            const msgDate = new Date(msg.timestamp);
            return msgDate >= timeframeStart && msgDate <= timeframeEnd;
        });

        if (validMessages.length < threshold.minMessages) {
            controller.enqueue(encoder.encode(
                `event: progress\ndata: ${JSON.stringify({
                    channelId: channel.id,
                    status: 'skipped',
                    messageCount: validMessages.length,
                    reason: `Insufficient messages (${validMessages.length} < ${threshold.minMessages})`
                })}\n\n`
            ));
            return null;
        }

        // Get previous report
        const previousReport = await getLatestReport(channel.id);

        // Generate summary
        const summary = await reportGenerator.createAISummary(
            validMessages,
            channel.name,
            hours,
            previousReport?.summary
        );

        if (!summary) {
            throw new Error('Failed to generate summary');
        }

        // Create and save report
        const report = {
            id: uuidv4(),
            channelId: channel.id,
            channelName: channel.name,
            timestamp: now.toISOString(),
            timeframe: {
                type: timeframe,
                start: timeframeStart.toISOString(),
                end: timeframeEnd.toISOString(),
            },
            messageCount: validMessages.length,
            summary,
            messages: validMessages
        };

        // Validate and save report
        const validation = await ReportService.addReport(report);
        if (validation.warnings.length > 0) {
            console.warn(`[BulkGenerate] Report validation warnings for ${channel.id}:`, validation.warnings);
        }

        // Send success update
        controller.enqueue(encoder.encode(
            `event: progress\ndata: ${JSON.stringify({
                channelId: channel.id,
                status: 'success',
                messageCount: validMessages.length,
                report: report,
                warnings: validation.warnings
            })}\n\n`
        ));

        return report;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[BulkGenerate] Error processing channel ${channel.id}:`, error);
        controller.enqueue(encoder.encode(
            `event: progress\ndata: ${JSON.stringify({
                channelId: channel.id,
                status: 'error',
                error: errorMessage
            })}\n\n`
        ));
        return null;
    }
}

export async function GET(request: NextRequest) {
    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Get and validate parameters
                const searchParams = request.nextUrl.searchParams;
                const params = BulkGenerationValidator.validateParams({
                    timeframe: searchParams.get('timeframe') as '1h' | '4h' | '24h',
                    minMessages: searchParams.get('minMessages') ? parseInt(searchParams.get('minMessages')!) : undefined,
                    batchSize: searchParams.get('batchSize') ? parseInt(searchParams.get('batchSize')!) : undefined
                });

                // Initialize services
                if (!process.env.DISCORD_TOKEN || !process.env.ANTHROPIC_API_KEY) {
                    throw new BulkGenerationError('Missing required environment variables', 'MISSING_ENV_VARS');
                }

                const discordClient = new DiscordClient(new MessageService(), new SourceService());
                const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
                const reportGenerator = new ReportGenerator(claudeClient);

                // Cache latest reports for all channels at start
                const allReports = await ReportService.getAllReports();
                console.log(`[BulkGenerate] Cached ${allReports.length} report groups`);

                // Fetch and validate channels
                const channels = await discordClient.fetchChannels();
                const filteredChannels = channels.filter(channel => !channel.name.includes('the-gulag'));
                const channelValidation = BulkGenerationValidator.validateChannels(filteredChannels);

                if (!channelValidation.isValid) {
                    throw new BulkGenerationError(
                        channelValidation.errors.join(', '),
                        'INVALID_CHANNELS'
                    );
                }

                // Initialize queue with validated channels
                const queue = new ChannelQueue(params.batchSize);

                // Set up queue event handlers
                queue.on('started', (channelId: string) => {
                    const channel = channelValidation.validChannels.find(c => c.id === channelId);
                    if (channel) {
                        processChannel(
                            channel,
                            params.timeframe,
                            discordClient,
                            reportGenerator,
                            controller,
                            { timeframe: params.timeframe, minMessages: params.minMessages }
                        ).then(report => {
                            if (report) {
                                queue.markComplete(channelId, report);
                            } else {
                                queue.markComplete(channelId);
                            }
                        }).catch(error => {
                            queue.markError(channelId, error.message);
                        });
                    }
                });

                queue.on('updated', (status) => {
                    try {
                        // Validate queue state
                        BulkGenerationValidator.validateQueueState(
                            status.total,
                            status.pending,
                            status.processing,
                            status.completed,
                            status.error
                        );

                        // Send status update
                        controller.enqueue(encoder.encode(
                            `event: status\ndata: ${JSON.stringify(status)}\n\n`
                        ));

                        if (queue.isComplete()) {
                            controller.enqueue(encoder.encode(
                                `event: complete\ndata: ${JSON.stringify({
                                    total: channelValidation.validChannels.length,
                                    skipped: channelValidation.skippedChannels.length,
                                    warnings: channelValidation.warnings
                                })}\n\n`
                            ));
                            controller.close();
                        }
                    } catch (error) {
                        if (error instanceof BulkGenerationError) {
                            console.error('[BulkGenerate] Queue state validation error:', error);
                            controller.enqueue(encoder.encode(
                                `event: error\ndata: ${JSON.stringify({
                                    error: error.message,
                                    code: error.code
                                })}\n\n`
                            ));
                            controller.close();
                        }
                    }
                });

                // Send initial channel list with validation results
                controller.enqueue(encoder.encode(
                    `event: channels\ndata: ${JSON.stringify({
                        channels: channelValidation.validChannels.map(c => ({
                            channelId: c.id,
                            channelName: c.name,
                            status: 'pending'
                        })),
                        skipped: channelValidation.skippedChannels,
                        warnings: channelValidation.warnings
                    })}\n\n`
                ));

                // Start processing validated channels
                queue.enqueue(channelValidation.validChannels);

            } catch (error) {
                console.error('[BulkGenerate] Error:', error);
                controller.enqueue(encoder.encode(
                    `event: error\ndata: ${JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error',
                        code: error instanceof BulkGenerationError ? error.code : 'UNKNOWN_ERROR'
                    })}\n\n`
                ));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
} 