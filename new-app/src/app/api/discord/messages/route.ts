import { DatabaseService } from '@/services/db';
import { DiscordClient } from '@/services/discord/client';
import { DiscordMessage } from '@/types';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const channelName = searchParams.get('channelName');
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

    if (!channelName) {
        return new Response(
            JSON.stringify({ error: 'Channel name is required' }),
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

    // Initialize database and client
    const db = new DatabaseService();
    db.initialize();
    const client = new DiscordClient(db);

    // Create a topic for this channel and timeframe
    const channelPrefix = channelName.split('|')[0].replace(/[^a-zA-Z0-9-]/g, '');
    const topicId = `topic_${channelPrefix}_${uuidv4()}`;
    db.insertTopic({
        id: topicId,
        name: `${channelName}|${channelId}-${timeframe}-${new Date().toISOString()}`
    });

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

            await client.fetchMessagesInTimeframe(channelId, hours, undefined, topicId);

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
            db.close();
            await writer.close();
        }
    })();

    return response;
} 