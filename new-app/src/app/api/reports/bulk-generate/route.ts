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
    const db = new DatabaseService();

    try {
        // Get parameters
        const searchParams = request.nextUrl.searchParams;
        const timeframe = searchParams.get('timeframe') as '1h' | '4h' | '24h';
        const minMessagesParam = searchParams.get('minMessages');

        console.log('[BulkGenerate] Starting with params:', { timeframe, minMessagesParam });

        if (!timeframe || !['1h', '4h', '24h'].includes(timeframe)) {
            return NextResponse.json(
                { error: 'Invalid timeframe parameter' },
                { status: 400 }
            );
        }

        // Get threshold
        const threshold = {
            ...DEFAULT_THRESHOLDS.find(t => t.timeframe === timeframe)!,
            minMessages: minMessagesParam ? parseInt(minMessagesParam) : DEFAULT_THRESHOLDS.find(t => t.timeframe === timeframe)!.minMessages
        };

        // Initialize services
        if (!process.env.DISCORD_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: 'Missing required environment variables' },
                { status: 500 }
            );
        }

        db.initialize();
        const discordClient = new DiscordClient(db);
        const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
        const reportGenerator = new ReportGenerator(claudeClient);

        // Fetch channels
        const channels = await discordClient.fetchChannels();
        const results: ChannelActivity[] = [];
        const generatedReports = [];

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

                // Fetch messages
                const messages = await discordClient.fetchMessagesInTimeframe(
                    channel.id,
                    timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1,
                    undefined,
                    topicId
                );

                const activity: ChannelActivity = {
                    channelId: channel.id,
                    channelName: channel.name,
                    messageCount: messages.length,
                    status: 'pending'
                };

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
                        activity.status = 'success';
                    }
                } else {
                    activity.status = 'skipped';
                }

                results.push(activity);
            } catch (error) {
                console.error(`[BulkGenerate] Error processing channel ${channel.name}:`, error);
                results.push({
                    channelId: channel.id,
                    channelName: channel.name,
                    messageCount: 0,
                    status: 'error'
                });
            }
        }

        return NextResponse.json({
            results,
            reports: generatedReports
        });
    } catch (error) {
        console.error('[BulkGenerate] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate reports' },
            { status: 500 }
        );
    } finally {
        db.close();
    }
} 