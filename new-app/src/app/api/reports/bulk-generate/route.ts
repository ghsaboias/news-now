import { AnthropicClient } from '@/services/claude/client';
import { DatabaseService } from '@/services/db';
import { DiscordClient } from '@/services/discord/client';
import { ReportGenerator } from '@/services/report/generator';
import { ReportStorage } from '@/services/report/storage';
import { ActivityThreshold, ChannelActivity } from '@/types';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_THRESHOLDS: ActivityThreshold[] = [
    { timeframe: '1h', minMessages: 3 },
    { timeframe: '4h', minMessages: 6 },
    { timeframe: '24h', minMessages: 10 },
];

export async function GET(request: NextRequest) {
    try {
        // Get timeframe and minMessages from query params
        const searchParams = request.nextUrl.searchParams;
        const timeframe = searchParams.get('timeframe') as '1h' | '4h' | '24h';
        const minMessagesParam = searchParams.get('minMessages');

        if (!timeframe || !['1h', '4h', '24h'].includes(timeframe)) {
            return NextResponse.json(
                { error: 'Invalid timeframe parameter' },
                { status: 400 }
            );
        }

        // Get threshold for selected timeframe and override minMessages if provided
        const threshold = {
            ...DEFAULT_THRESHOLDS.find(t => t.timeframe === timeframe)!,
            minMessages: minMessagesParam ? parseInt(minMessagesParam) : DEFAULT_THRESHOLDS.find(t => t.timeframe === timeframe)!.minMessages
        };

        // Initialize clients
        if (!process.env.DISCORD_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: 'Missing required environment variables' },
                { status: 500 }
            );
        }

        // Initialize database
        const db = new DatabaseService();
        db.initialize();

        const discordClient = new DiscordClient(db);
        const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
        const reportGenerator = new ReportGenerator(claudeClient);
        const channels = await discordClient.fetchChannels();
        const activeChannels: ChannelActivity[] = [];

        // Set up SSE
        const encoder = new TextEncoder();
        const stream = new TransformStream();
        const writer = stream.writable.getWriter();

        const response = new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

        // Start the process
        (async () => {
            try {
                // Process each channel
                for (const channel of channels) {
                    const channelActivity: ChannelActivity = {
                        channelId: channel.id,
                        channelName: channel.name,
                        messageCount: undefined,
                        status: 'pending'
                    };
                    activeChannels.push(channelActivity);

                    // Send scanning update
                    await writer.write(
                        encoder.encode(`data: ${JSON.stringify({
                            type: 'scanning',
                            channel: channel.name,
                            channels: activeChannels
                        })}\n\n`)
                    );

                    try {
                        // Add delay between channels
                        if (activeChannels.length > 1) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }

                        channelActivity.status = 'processing';

                        // Send scanning update
                        await writer.write(
                            encoder.encode(`data: ${JSON.stringify({
                                type: 'scanning',
                                channels: activeChannels
                            })}\n\n`)
                        );

                        // Create a topic for this channel with descriptive ID
                        const channelPrefix = channel.name.split('|')[0].replace(/[^a-zA-Z0-9-]/g, '');
                        const topicId = `topic_${channelPrefix}_${uuidv4()}`;
                        db.insertTopic({
                            id: topicId,
                            name: `${channel.name}|${channel.id}-${timeframe}-${new Date().toISOString()}`
                        });

                        const messages = await discordClient.fetchMessagesInTimeframe(
                            channel.id,
                            timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1,
                            undefined,
                            topicId  // Pass the topicId here
                        );

                        // Set the actual message count after fetching
                        channelActivity.messageCount = messages.length;

                        // Send scanning update with message count
                        await writer.write(
                            encoder.encode(`data: ${JSON.stringify({
                                type: 'scanning',
                                channels: activeChannels
                            })}\n\n`)
                        );

                        if (messages.length >= threshold.minMessages) {
                            channelActivity.status = 'success';

                            // Generate report
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

                                // Send report update
                                await writer.write(
                                    encoder.encode(`data: ${JSON.stringify({
                                        type: 'report',
                                        report
                                    })}\n\n`)
                                );
                            }
                        } else {
                            channelActivity.status = 'skipped';

                            // Send scanning update with skipped status
                            await writer.write(
                                encoder.encode(`data: ${JSON.stringify({
                                    type: 'scanning',
                                    channels: activeChannels
                                })}\n\n`)
                            );
                        }
                    } catch (error) {
                        console.error(`Error processing channel ${channel.name}:`, error);
                        channelActivity.status = 'error';

                        // Send scanning update with error status
                        await writer.write(
                            encoder.encode(`data: ${JSON.stringify({
                                type: 'scanning',
                                channels: activeChannels
                            })}\n\n`)
                        );
                    }
                }

                // Send completion
                await writer.write(
                    encoder.encode(`data: ${JSON.stringify({
                        type: 'complete',
                        channels: activeChannels
                    })}\n\n`)
                );
            } catch (error) {
                console.error('Error in bulk generation:', error);
                await writer.write(
                    encoder.encode(`data: ${JSON.stringify({
                        type: 'error',
                        error: 'Failed to generate reports'
                    })}\n\n`)
                );
            } finally {
                if (db) {
                    db.close();
                }
                await writer.close();
            }
        })();

        return response;
    } catch (error) {
        console.error('Error in bulk generation:', error);
        return NextResponse.json(
            { error: 'Failed to generate reports' },
            { status: 500 }
        );
    }
} 