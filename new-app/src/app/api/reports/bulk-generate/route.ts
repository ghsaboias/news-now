import { AnthropicClient } from '@/services/claude/client';
import { DiscordClient } from '@/services/discord/client';
import { MessageService } from '@/services/redis/messages';
import { ReportService } from '@/services/redis/reports';
import { SourceService } from '@/services/redis/sources';
import { TopicService } from '@/services/redis/topics';
import { ReportGenerator } from '@/services/report/generator';
import { ChannelQueue } from '@/services/report/queue';
import { ActivityThreshold, ChannelInfo, Report, ReportGroup } from '@/types';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const BATCH_SIZE = 3;
const DEFAULT_THRESHOLDS: ActivityThreshold[] = [
    { timeframe: '1h', minMessages: 3 },
    { timeframe: '4h', minMessages: 6 },
    { timeframe: '24h', minMessages: 10 },
];

async function getLatestReport(channelId: string): Promise<Report | undefined> {
    const reportGroups = await ReportService.getAllReports();
    return reportGroups
        .flatMap((group: ReportGroup) => group.reports)
        .filter((r: Report) => r.channelId === channelId)
        .sort((a: Report, b: Report) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
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
        // Create topic
        const channelPrefix = channel.name.split('|')[0].replace(/[^a-zA-Z0-9-]/g, '');
        const topicId = `topic_${channelPrefix}_${uuidv4()}`;
        await topicService.create({
            id: topicId,
            name: `${channel.name}|${channel.id}-${timeframe}-${new Date().toISOString()}`
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
            timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1,
            undefined,
            topicId
        );

        if (messages.length < threshold.minMessages) {
            controller.enqueue(encoder.encode(
                `event: progress\ndata: ${JSON.stringify({
                    channelId: channel.id,
                    status: 'skipped',
                    messageCount: messages.length
                })}\n\n`
            ));
            return null;
        }

        // Get previous report - now using the optimized function
        const previousReport = await getLatestReport(channel.id);

        // Generate summary
        const summary = await reportGenerator.createAISummary(
            messages,
            channel.name,
            timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1,
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
            timestamp: new Date().toISOString(),
            timeframe: {
                type: timeframe,
                start: new Date(Date.now() - (timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1) * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString(),
            },
            messageCount: messages.length,
            summary,
        };

        await ReportService.addReport(report);

        // Send success update
        controller.enqueue(encoder.encode(
            `event: progress\ndata: ${JSON.stringify({
                channelId: channel.id,
                status: 'success',
                messageCount: messages.length,
                report: report
            })}\n\n`
        ));

        return report;
    } catch (error) {
        console.error(`Error processing channel ${channel.id}:`, error);
        controller.enqueue(encoder.encode(
            `event: progress\ndata: ${JSON.stringify({
                channelId: channel.id,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`
        ));
        return null;
    }
}

const encoder = new TextEncoder();

export async function GET(request: NextRequest) {
    const topicService = new TopicService();
    const messageService = new MessageService();
    const sourceService = new SourceService();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Get parameters
                const searchParams = request.nextUrl.searchParams;
                const timeframe = searchParams.get('timeframe') as '1h' | '4h' | '24h';
                const minMessagesParam = searchParams.get('minMessages');

                if (!timeframe || !['1h', '4h', '24h'].includes(timeframe)) {
                    throw new Error('Invalid timeframe parameter');
                }

                // Get threshold
                const threshold = {
                    ...DEFAULT_THRESHOLDS.find(t => t.timeframe === timeframe)!,
                    minMessages: minMessagesParam ? parseInt(minMessagesParam) : DEFAULT_THRESHOLDS.find(t => t.timeframe === timeframe)!.minMessages
                };

                // Initialize services
                if (!process.env.DISCORD_TOKEN || !process.env.ANTHROPIC_API_KEY) {
                    throw new Error('Missing required environment variables');
                }

                const discordClient = new DiscordClient(messageService, sourceService);
                const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
                const reportGenerator = new ReportGenerator(claudeClient);

                // Cache latest reports for all channels at start
                const allReports = await ReportService.getAllReports();
                console.log(`[BulkGenerate] Cached ${allReports.length} report groups`);

                // Fetch channels
                const channels = await discordClient.fetchChannels();

                // Initialize queue
                const queue = new ChannelQueue(BATCH_SIZE);

                // Set up queue event handlers
                queue.on('started', (channelId: string) => {
                    const channel = channels.find(c => c.id === channelId);
                    if (channel) {
                        processChannel(
                            channel,
                            timeframe,
                            discordClient,
                            reportGenerator,
                            controller,
                            threshold
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
                    controller.enqueue(encoder.encode(
                        `event: status\ndata: ${JSON.stringify(status)}\n\n`
                    ));

                    if (queue.isComplete()) {
                        controller.enqueue(encoder.encode(
                            `event: complete\ndata: ${JSON.stringify({
                                total: channels.length
                            })}\n\n`
                        ));
                        controller.close();
                    }
                });

                // Send initial channel list
                controller.enqueue(encoder.encode(
                    `event: channels\ndata: ${JSON.stringify({
                        channels: channels.map(c => ({
                            channelId: c.id,
                            channelName: c.name,
                            status: 'pending'
                        }))
                    })}\n\n`
                ));

                // Start processing
                queue.enqueue(channels);

            } catch (error) {
                console.error('[BulkGenerate] Error:', error);
                controller.enqueue(encoder.encode(
                    `event: error\ndata: ${JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error'
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