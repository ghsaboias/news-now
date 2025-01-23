import { DiscordChannel, DiscordMessage } from '@/types';
import { config } from '@/utils/config';
import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '../db';
import { MessageProcessor } from '../message/processor';

// Discord API has a limit of 50 requests per second per token
const MAX_REQUESTS_PER_SECOND = 48; // Using 48 to stay just under the limit
const REQUEST_WINDOW_MS = 1000; // Use full second window for better rate management

export class DiscordClient {
    private readonly api: AxiosInstance;
    private readonly baseUrl = 'https://discord.com/api/v10';
    private messageProcessor?: MessageProcessor;
    private requestQueue: Array<() => Promise<any>> = [];
    private isProcessingQueue = false;
    private requestsInCurrentWindow = 0;
    private windowStartTime = Date.now();
    private channelNames: Map<string, string> = new Map();
    public onMessageBatch?: (batchSize: number, botMessages: number, messages: DiscordMessage[]) => Promise<void>;

    constructor(dbService?: DatabaseService) {
        this.api = axios.create({
            baseURL: this.baseUrl,
            headers: {
                Authorization: config.DISCORD_TOKEN,
                'Content-Type': 'application/json',
            },
            timeout: config.REQUEST_TIMEOUT,
        });

        if (dbService) {
            this.messageProcessor = new MessageProcessor(dbService);
        }
    }

    private async executeRequest<T>(request: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    const result = await request();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessingQueue) return;
        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const now = Date.now();
            if (now - this.windowStartTime >= REQUEST_WINDOW_MS) {
                this.requestsInCurrentWindow = 0;
                this.windowStartTime = now;
            }

            if (this.requestsInCurrentWindow >= MAX_REQUESTS_PER_SECOND) {
                const waitTime = REQUEST_WINDOW_MS - (now - this.windowStartTime);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            const request = this.requestQueue.shift();
            if (request) {
                this.requestsInCurrentWindow++;
                await request();
            }
        }

        this.isProcessingQueue = false;
    }

    async fetchChannels(): Promise<DiscordChannel[]> {
        try {
            const response = await this.executeRequest(() =>
                this.api.get(`/guilds/${config.GUILD_ID}/channels`)
            );
            const channels = response.data;

            // Store channel names for logging, including emoji prefixes
            channels.forEach((channel: DiscordChannel) => {
                if (channel.name) {
                    this.channelNames.set(channel.id, channel.name);
                }
            });

            // Filter channels based on criteria
            const allowedEmojis = new Set(['🟡', '🔴', '🟠', '⚫']);
            const firstChar = (str: string) => Array.from(str)[0];

            const filteredChannels = channels.filter((channel: DiscordChannel) =>
                channel.type === 0 && (
                    (
                        channel.name.length > 0 &&
                        allowedEmojis.has(firstChar(channel.name)) &&
                        !channel.name.includes('godly-chat') &&
                        (channel.position || 0) < 30
                    ) ||
                    channel.parent_id === '1112044935982633060'
                )
            );
            return filteredChannels;
        } catch (error) {
            console.error('Error fetching channels:', error);
            throw new Error('Failed to fetch Discord channels');
        }
    }

    async fetchMessageBatch(
        channelId: string,
        lastMessageId?: string
    ): Promise<DiscordMessage[]> {
        try {
            const params = new URLSearchParams({ limit: '100' });
            if (lastMessageId) {
                params.append('before', lastMessageId);
            }

            const response = await this.executeRequest(() =>
                this.api.get(`/channels/${channelId}/messages?${params.toString()}`)
            );

            return response.data;
        } catch (error) {
            console.error('Error fetching message batch:', error);
            throw new Error('Failed to fetch Discord messages');
        }
    }

    async fetchMessagesInTimeframe(
        channelId: string,
        hours: number = 24,
        minutes?: number,
        topicId?: string,
        existingMessages?: DiscordMessage[]
    ): Promise<DiscordMessage[]> {
        const messages: DiscordMessage[] = [];
        let lastMessageId: string | undefined;
        const startTime = performance.now();
        let totalApiTime = 0;
        let totalProcessingTime = 0;

        // Calculate cutoff time based on hours or minutes
        const cutoffTime = new Date();
        const timeframeStr = minutes !== undefined ? `${minutes}m` : `${hours}h`;
        const channelName = this.channelNames.get(channelId) || channelId;

        if (minutes !== undefined) {
            cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);
        } else {
            cutoffTime.setHours(cutoffTime.getHours() - hours);
        }

        // If we have existing messages, filter them instead of fetching
        if (existingMessages) {
            const processStartTime = performance.now();
            for (const msg of existingMessages) {
                const msgTime = new Date(msg.timestamp);
                if (msgTime >= cutoffTime) {
                    messages.push(msg);
                }
            }
            const processEndTime = performance.now();
            totalProcessingTime += (processEndTime - processStartTime);

            // Notify about the reused messages if handler exists
            if (this.onMessageBatch && messages.length > 0) {
                await this.onMessageBatch(messages.length, messages.length, messages);
            }

            console.log(`[${channelName}|${timeframeStr}] Reused ${messages.length} messages from cache`);
            console.log(`[${channelName}|${timeframeStr}] Total bot messages found: ${messages.length}`);
            console.log(`[${channelName}|${timeframeStr}] Performance: Total ${totalProcessingTime.toFixed(0)}ms | API: 0ms (0.0%) | Processing: ${totalProcessingTime.toFixed(0)}ms (100.0%)`);

            return messages;
        }

        // Otherwise fetch messages
        while (true) {
            const batchStartTime = performance.now();

            // Fetch batch
            const apiStartTime = performance.now();
            const batch = await this.fetchMessageBatch(channelId, lastMessageId);
            const apiEndTime = performance.now();
            totalApiTime += (apiEndTime - apiStartTime);

            if (!batch || batch.length === 0) {
                break;
            }

            // Process batch and get bot messages
            let batchBotMessages = 0;
            const batchMessages: DiscordMessage[] = [];

            const processStartTime = performance.now();
            for (const msg of batch) {
                const msgTime = new Date(msg.timestamp);
                if (
                    msg.author?.username === 'FaytuksBot' &&
                    msg.author?.discriminator === '7032' &&
                    msgTime >= cutoffTime
                ) {
                    messages.push(msg);
                    batchMessages.push(msg);
                    batchBotMessages++;
                }
            }

            // Process messages in database if messageProcessor exists and topicId is provided
            if (this.messageProcessor && topicId && batchMessages.length > 0) {
                await this.messageProcessor.processBatch(batchMessages, topicId);
            }

            const processEndTime = performance.now();
            totalProcessingTime += (processEndTime - processStartTime);

            // Notify about the batch if handler exists
            if (this.onMessageBatch) {
                await this.onMessageBatch(batch.length, batchBotMessages, batchMessages);
            }

            console.log(`[${channelName}|${timeframeStr}] Processed batch of ${batch.length} messages, found ${batchBotMessages} bot messages`);

            // Check if we should stop
            const lastMsgTime = new Date(batch[batch.length - 1].timestamp);
            if (lastMsgTime < cutoffTime) {
                break;
            }

            lastMessageId = batch[batch.length - 1].id;

            // Memory management: If we've collected too many messages, break
            if (messages.length >= config.MAX_BATCH_SIZE) {
                console.warn(`[${channelName}|${timeframeStr}] Reached maximum batch size of ${config.MAX_BATCH_SIZE} messages`);
                break;
            }
        }

        const endTime = performance.now();
        const totalDuration = endTime - startTime;

        console.log(`[${channelName}|${timeframeStr}] Total bot messages found: ${messages.length}`);
        console.log(`[${channelName}|${timeframeStr}] Performance: Total ${totalDuration.toFixed(0)}ms | API: ${totalApiTime.toFixed(0)}ms (${((totalApiTime / totalDuration) * 100).toFixed(1)}%) | Processing: ${totalProcessingTime.toFixed(0)}ms (${((totalProcessingTime / totalDuration) * 100).toFixed(1)}%)`);

        return messages;
    }

    formatRawMessageReport(channelName: string, messages: DiscordMessage[]): string {
        let report = `📊 Report for #${channelName}\n\n`;

        if (messages.length === 0) {
            return report + 'No messages found in the specified timeframe\\.';
        }

        for (const msg of messages) {
            const timestamp = new Date(msg.timestamp)
                .toISOString()
                .replace(/T/, ' ')
                .replace(/\..+/, ' UTC');
            report += `🕒 \`${timestamp}\`\n${msg.content}\n\n`;
        }

        return report;
    }
} 