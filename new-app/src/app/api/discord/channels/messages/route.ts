export const dynamic = 'force-dynamic';

import { DiscordClient } from '@/services/discord/client';
import { DiscordMessage } from '@/types';

const TIME_PERIODS = ['1h', '4h', '24h'] as const;
type TimePeriod = typeof TIME_PERIODS[number];

// Maximum number of channels to process concurrently
const MAX_CONCURRENT_CHANNELS = 15;

interface FetchTask {
    channelId: string;
    period: string;
    hours: number;
}

// Group tasks by channel for better parallelization
function groupTasksByChannel(tasks: FetchTask[]): FetchTask[][] {
    const channelMap = new Map<string, FetchTask[]>();

    tasks.forEach(task => {
        if (!channelMap.has(task.channelId)) {
            channelMap.set(task.channelId, []);
        }
        channelMap.get(task.channelId)!.push(task);
    });

    return Array.from(channelMap.values());
}

async function processChannel(
    channelTasks: FetchTask[],
    client: DiscordClient,
    writer: WritableStreamDefaultWriter<Uint8Array>
): Promise<void> {
    const encoder = new TextEncoder();

    // Sort tasks by hours descending to fetch longest timeframe first
    const sortedTasks = [...channelTasks].sort((a, b) => b.hours - a.hours);
    let cachedMessages: DiscordMessage[] | undefined;

    // Process all periods for this channel, reusing messages where possible
    for (const task of sortedTasks) {
        try {
            const messages = await client.fetchMessagesInTimeframe(
                task.channelId,
                task.hours,
                undefined,
                undefined,
                cachedMessages?.length || 0
            );

            // Cache messages from the longest timeframe
            if (!cachedMessages && task === sortedTasks[0]) {
                cachedMessages = messages;
            }

            await writer.write(
                encoder.encode(`data: ${JSON.stringify({
                    type: 'update',
                    results: [{
                        channelId: task.channelId,
                        period: task.period,
                        count: messages.length,
                        error: false
                    }]
                })}\n\n`)
            );
        } catch (error) {
            console.error(`Error fetching messages for channel ${task.channelId} (${task.period}):`, error);
            await writer.write(
                encoder.encode(`data: ${JSON.stringify({
                    type: 'update',
                    results: [{
                        channelId: task.channelId,
                        period: task.period,
                        count: 0,
                        error: true
                    }]
                })}\n\n`)
            );
        }
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const channelIds = searchParams.get('channelIds')?.split(',') || [];
        const periods = searchParams.get('periods')?.split(',').filter(p => TIME_PERIODS.includes(p as TimePeriod)) || ['1h'];

        if (channelIds.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No channel IDs provided' }),
                { status: 400 }
            );
        }

        const encoder = new TextEncoder();
        const stream = new TransformStream();
        const writer = stream.writable.getWriter();

        // Start processing in the background
        (async () => {
            try {
                const client = new DiscordClient();

                // Fetch channels once at the start
                await client.fetchChannels();

                const fetchTasks = channelIds.flatMap(channelId =>
                    periods.map(period => ({
                        channelId,
                        period,
                        hours: period === '1h' ? 1 : period === '4h' ? 4 : 24
                    }))
                );

                // Group tasks by channel
                const channelGroups = groupTasksByChannel(fetchTasks);

                // Process channels in parallel with controlled concurrency
                const queue = [...channelGroups];
                const inProgress = new Set<Promise<void>>();

                while (queue.length > 0 || inProgress.size > 0) {
                    // Fill up to MAX_CONCURRENT_CHANNELS
                    while (queue.length > 0 && inProgress.size < MAX_CONCURRENT_CHANNELS) {
                        const channelTasks = queue.shift()!;
                        const promise = processChannel(channelTasks, client, writer)
                            .finally(() => {
                                inProgress.delete(promise);
                            });
                        inProgress.add(promise);
                    }

                    if (inProgress.size > 0) {
                        await Promise.race(inProgress);
                    }
                }

                await writer.write(
                    encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
                );
            } catch (error) {
                console.error('Error processing messages:', error);
                await writer.write(
                    encoder.encode(`data: ${JSON.stringify({
                        type: 'error',
                        error: 'Failed to process messages'
                    })}\n\n`)
                );
            } finally {
                await writer.close();
            }
        })();

        return new Response(stream.readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error('Error in /api/discord/channels/messages:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to setup message counting' }),
            { status: 500 }
        );
    }
} 