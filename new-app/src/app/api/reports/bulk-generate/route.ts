import { AnthropicClient } from '@/services/claude/client';
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
        // Get timeframe from query params
        const searchParams = request.nextUrl.searchParams;
        const timeframe = searchParams.get('timeframe') as '1h' | '4h' | '24h';

        if (!timeframe || !['1h', '4h', '24h'].includes(timeframe)) {
            return NextResponse.json(
                { error: 'Invalid timeframe parameter' },
                { status: 400 }
            );
        }

        // Get threshold for selected timeframe
        const threshold = DEFAULT_THRESHOLDS.find(t => t.timeframe === timeframe);
        if (!threshold) {
            return NextResponse.json(
                { error: 'Invalid timeframe configuration' },
                { status: 500 }
            );
        }

        // Initialize clients
        if (!process.env.DISCORD_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: 'Missing required environment variables' },
                { status: 500 }
            );
        }

        const discordClient = new DiscordClient();
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
                        messageCount: 0,
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
                        const messages = await discordClient.fetchMessagesInTimeframe(
                            channel.id,
                            timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1
                        );

                        if (messages.length >= threshold.minMessages) {
                            channelActivity.messageCount = messages.length;
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
                            channelActivity.messageCount = messages.length;
                        }
                    } catch (error) {
                        console.error(`Error processing channel ${channel.name}:`, error);
                        channelActivity.status = 'error';
                    }

                    // Send progress update
                    await writer.write(
                        encoder.encode(`data: ${JSON.stringify({
                            type: 'progress',
                            channel: channel.name,
                            channels: activeChannels
                        })}\n\n`)
                    );
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