import { AnthropicClient } from '@/services/claude/client';
import { DatabaseService } from '@/services/db';
import { DiscordClient } from '@/services/discord/client';
import { ReportGenerator } from '@/services/report/generator';
import { ReportStorage } from '@/services/report/storage';
import { ActivityThreshold } from '@/types';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_THRESHOLDS: ActivityThreshold[] = [
    { timeframe: '1h', minMessages: 3 },
    { timeframe: '4h', minMessages: 6 },
    { timeframe: '24h', minMessages: 10 },
];

export async function GET(request: NextRequest) {
    const db = new DatabaseService();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Get parameters
                const searchParams = request.nextUrl.searchParams;
                const timeframe = searchParams.get('timeframe') as '1h' | '4h' | '24h';
                const minMessagesParam = searchParams.get('minMessages');

                console.log('[BulkGenerate] Starting with params:', { timeframe, minMessagesParam });

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

                db.initialize();
                const discordClient = new DiscordClient(db);
                const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
                const reportGenerator = new ReportGenerator(claudeClient);

                // Fetch channels
                const channels = await discordClient.fetchChannels();
                const generatedReports = [];

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

                // Process each channel sequentially
                for (const channel of channels) {
                    console.log(`[BulkGenerate] Processing channel: ${channel.name}`);

                    try {
                        // Create topic
                        const channelPrefix = channel.name.split('|')[0].replace(/[^a-zA-Z0-9-]/g, '');
                        const topicId = `topic_${channelPrefix}_${uuidv4()}`;
                        db.insertTopic({
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

                        // Generate report if enough messages
                        if (messages.length >= threshold.minMessages) {
                            const summary = await reportGenerator.createAISummary(
                                messages,
                                channel.name,
                                timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1
                            );

                            if (summary) {
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

                                await ReportStorage.saveReport(report);
                                generatedReports.push(report);

                                // Send success update
                                controller.enqueue(encoder.encode(
                                    `event: progress\ndata: ${JSON.stringify({
                                        channelId: channel.id,
                                        status: 'success',
                                        messageCount: messages.length
                                    })}\n\n`
                                ));
                            }
                        } else {
                            // Send skipped update
                            controller.enqueue(encoder.encode(
                                `event: progress\ndata: ${JSON.stringify({
                                    channelId: channel.id,
                                    status: 'skipped',
                                    messageCount: messages.length
                                })}\n\n`
                            ));
                        }
                    } catch (error) {
                        console.error(`[BulkGenerate] Error processing channel ${channel.name}:`, error);

                        // Send error update for this channel
                        controller.enqueue(encoder.encode(
                            `event: progress\ndata: ${JSON.stringify({
                                channelId: channel.id,
                                status: 'error',
                                error: error instanceof Error ? error.message : 'Unknown error'
                            })}\n\n`
                        ));
                    }
                }

                // Send completion event with generated reports
                controller.enqueue(encoder.encode(
                    `event: complete\ndata: ${JSON.stringify({
                        reports: generatedReports,
                        total: channels.length
                    })}\n\n`
                ));
            } catch (error) {
                console.error('[BulkGenerate] Error:', error);
                controller.enqueue(encoder.encode(
                    `event: error\ndata: ${JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error'
                    })}\n\n`
                ));
            } finally {
                db.close();
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