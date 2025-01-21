import { DiscordClient } from '@/services/discord/client';
import { DiscordMessage } from '@/types';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const timeframe = searchParams.get('timeframe') || '24h';

    if (!channelId) {
        return new Response(
            JSON.stringify({ error: 'Channel ID is required' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    const hours = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 24;

    // Set up SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const client = new DiscordClient();

    // Create response with appropriate headers for SSE
    const response = new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });

    // Start the message fetching process
    (async () => {
        try {
            let totalMessages = 0;
            let batchCount = 0;
            let allMessages: DiscordMessage[] = [];

            // Override the client's message batch handler
            client.onMessageBatch = async (batchSize: number, botMessages: number, messages: DiscordMessage[]) => {
                batchCount++;
                totalMessages += botMessages;
                allMessages = allMessages.concat(messages);

                const update = {
                    type: 'batch',
                    batchCount,
                    batchSize,
                    botMessages,
                    totalMessages,
                };

                await writer.write(
                    encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
                );
            };

            await client.fetchMessagesInTimeframe(channelId, hours);

            // Send final update with all accumulated messages
            await writer.write(
                encoder.encode(`data: ${JSON.stringify({
                    type: 'complete',
                    messages: allMessages,
                    totalMessages,
                    batchCount,
                })}\n\n`)
            );
        } catch (error) {
            console.error('Error in /api/discord/messages:', error);
            await writer.write(
                encoder.encode(`data: ${JSON.stringify({
                    type: 'error',
                    error: 'Failed to fetch messages'
                })}\n\n`)
            );
        } finally {
            await writer.close();
        }
    })();

    return response;
} 