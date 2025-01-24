import { DatabaseService } from '@/services/db';
import { DiscordClient } from '@/services/discord/client';
import { DiscordMessage } from '@/types';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Memory-efficient batch size and limits
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const MAX_MESSAGES_IN_MEMORY = 100;
const MEMORY_CHECK_INTERVAL = 20; // Check memory every N messages
const BATCH_PROCESSING_DELAY = 100; // ms between batches to prevent memory spikes

// Memory-efficient message structure
interface OptimizedMessage {
    id: string;
    content: string;
    timestamp: string;
    author: {
        username: string;
        discriminator: string;
    };
    embedCount: number;
}

function optimizeMessage(msg: DiscordMessage): OptimizedMessage {
    return {
        id: msg.id,
        content: msg.content,
        timestamp: msg.timestamp,
        author: {
            username: msg.author?.username || '',
            discriminator: msg.author?.discriminator || ''
        },
        embedCount: msg.embeds?.length || 0
    };
}

// Memory monitoring with garbage collection hints
function logMemoryUsage(context: string) {
    const used = process.memoryUsage();
    console.log(`[Memory Usage] ${context}:
        - Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(1)}MB
        - Heap Total: ${(used.heapTotal / 1024 / 1024).toFixed(1)}MB
        - RSS: ${(used.rss / 1024 / 1024).toFixed(1)}MB`);

    // Hint to V8 that now might be a good time for GC
    if (global.gc) {
        global.gc();
    }
}

// Batch processing with memory management
async function processBatch(
    messages: DiscordMessage[],
    optimizedMessages: OptimizedMessage[],
    batchCount: number
): Promise<OptimizedMessage[]> {
    // Optimize messages
    const newMessages = messages.map(optimizeMessage);

    // Add to optimized messages array
    optimizedMessages.push(...newMessages);

    // Memory management: keep only recent messages if exceeding limit
    if (optimizedMessages.length > MAX_MESSAGES_IN_MEMORY) {
        optimizedMessages = optimizedMessages.slice(-MAX_MESSAGES_IN_MEMORY);
        if (global.gc) {
            global.gc();
        }
    }

    // Clear original messages to help GC
    messages.length = 0;

    // Add delay between batches to prevent memory spikes
    await new Promise(resolve => setTimeout(resolve, BATCH_PROCESSING_DELAY));

    return optimizedMessages;
}

interface StreamUpdate {
    type: 'init' | 'progress' | 'batch' | 'complete' | 'error';
    stage?: 'setup' | 'fetching' | 'processing' | 'complete' | 'error';
    batchCount?: number;
    batchSize?: number;
    progress?: number;
    messages?: DiscordMessage[];
    totalMessages?: number;
    error?: string;
    status?: string;
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const channelName = searchParams.get('channelName');
    const timeframe = searchParams.get('timeframe') || '24h';

    if (!channelId || !channelName) {
        return new Response(
            JSON.stringify({
                error: `${!channelId ? 'Channel ID' : 'Channel name'} is required`
            }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    const hours = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 24;
    const startTime = Date.now();
    const milestones: { [key: string]: number } = {};
    let messageCount = 0;
    let optimizedMessages: OptimizedMessage[] = [];

    const logMilestone = (name: string) => {
        milestones[name] = Date.now() - startTime;
        console.log(`[Milestone] ${name}: ${milestones[name]}ms`);

        // Log memory usage at key milestones
        if (name.includes('Batch') || name.includes('complete')) {
            logMemoryUsage(name);
        }
    };

    // Set up streaming
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper function to send updates
    const sendUpdate = async (update: StreamUpdate) => {
        try {
            await writer.write(
                encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
            );
            if (update.stage) {
                logMilestone(`Stage: ${update.stage} (${update.status}) - Progress: ${update.progress}%`);
            }
        } catch (error) {
            console.error('Error sending update:', error);
        }
    };

    // Start processing in the background
    (async () => {
        const db = new DatabaseService();
        let client: DiscordClient | null = null;

        try {
            logMilestone('Starting message fetch process');
            logMemoryUsage('Initial');

            // Setup phase
            await sendUpdate({
                type: 'init',
                stage: 'setup',
                progress: 0,
                status: 'Initializing...'
            });

            db.initialize();
            client = new DiscordClient(db);
            logMilestone('Database and client initialized');

            await sendUpdate({
                type: 'progress',
                stage: 'setup',
                progress: 30,
                status: 'Fetching channel information...'
            });

            await client.fetchChannels();
            logMilestone('Channels fetched');

            await sendUpdate({
                type: 'progress',
                stage: 'setup',
                progress: 50,
                status: 'Preparing database...'
            });

            // Create topic
            const channelPrefix = channelName.split('|')[0].replace(/[^a-zA-Z0-9-]/g, '');
            const topicId = `topic_${channelPrefix}_${uuidv4()}`;
            db.insertTopic({
                id: topicId,
                name: `${channelName}|${channelId}-${timeframe}-${new Date().toISOString()}`
            });
            logMilestone('Topic created');

            // Fetching phase
            let batchCount = 0;
            let lastBatchTime = Date.now();

            await sendUpdate({
                type: 'progress',
                stage: 'fetching',
                progress: 60,
                status: 'Starting message fetch...'
            });

            // Override message batch handler with memory-efficient processing
            client.onMessageBatch = async (batchSize: number, botMessages: number, messages: DiscordMessage[]) => {
                const now = Date.now();
                const batchDuration = now - lastBatchTime;
                lastBatchTime = now;

                batchCount++;
                messageCount += messages.length;

                // Process batch with memory management
                optimizedMessages = await processBatch(messages, optimizedMessages, batchCount);

                // Calculate progress
                const fetchProgress = Math.min(
                    60 + Math.round((messageCount / (hours * 50)) * 30),
                    90
                );

                logMilestone(`Batch ${batchCount} processed - ${messages.length} messages in ${batchDuration}ms (${(messages.length / batchDuration * 1000).toFixed(1)} msgs/sec)`);

                if (batchCount % MEMORY_CHECK_INTERVAL === 0) {
                    logMemoryUsage(`After ${batchCount} batches`);
                }

                await sendUpdate({
                    type: 'batch',
                    stage: 'fetching',
                    batchCount,
                    batchSize,
                    progress: fetchProgress,
                    status: `Processing batch ${batchCount} (${messageCount} messages)`,
                    messages: optimizedMessages.slice(-batchSize), // Send only latest batch
                    totalMessages: messageCount
                });
            };

            // Start fetching with retry logic
            let retryCount = 0;
            while (retryCount < MAX_RETRIES) {
                try {
                    await sendUpdate({
                        type: 'progress',
                        stage: 'fetching',
                        progress: 60,
                        status: 'Fetching messages...'
                    });

                    const fetchStartTime = Date.now();
                    await client.fetchMessagesInTimeframe(
                        channelId,
                        hours,
                        undefined,
                        topicId,
                        BATCH_SIZE
                    );
                    logMilestone(`All messages fetched in ${Date.now() - fetchStartTime}ms`);

                    await sendUpdate({
                        type: 'progress',
                        stage: 'processing',
                        progress: 95,
                        status: 'Processing messages...'
                    });

                    // Send completion update with all messages
                    await sendUpdate({
                        type: 'complete',
                        stage: 'complete',
                        progress: 100,
                        status: `Completed - ${messageCount} messages processed`,
                        messages: optimizedMessages,
                        totalMessages: messageCount,
                        batchCount
                    });

                    const totalTime = Date.now() - startTime;
                    logMemoryUsage('Final');
                    console.log(`[Performance Summary]
                        - Total time: ${totalTime}ms
                        - Messages processed: ${messageCount}
                        - Batches: ${batchCount}
                        - Avg batch size: ${(messageCount / batchCount).toFixed(1)}
                        - Avg processing speed: ${(messageCount / totalTime * 1000).toFixed(1)} msgs/sec`);

                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount === MAX_RETRIES) throw error;

                    logMilestone(`Retry ${retryCount}/${MAX_RETRIES} - ${(error as Error).message}`);
                    await sendUpdate({
                        type: 'error',
                        stage: 'error',
                        progress: 0,
                        status: `Retry ${retryCount}/${MAX_RETRIES}`,
                        error: `Retry ${retryCount}/${MAX_RETRIES}: ${(error as Error).message}`,
                    });

                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }
        } catch (error) {
            console.error('Error in /api/discord/messages:', error);
            logMilestone(`Error occurred: ${(error as Error).message}`);
            await sendUpdate({
                type: 'error',
                stage: 'error',
                progress: 0,
                status: 'Error occurred',
                error: 'Failed to fetch messages: ' + (error as Error).message
            });
        } finally {
            // Clear optimized messages before cleanup
            optimizedMessages = [];
            if (global.gc) {
                global.gc();
            }

            if (client) client.cleanup();
            db.close();
            await writer.close();
            logMilestone('Cleanup complete');
            logMemoryUsage('Final');
        }
    })();

    return new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
} 