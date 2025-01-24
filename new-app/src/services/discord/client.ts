import { DiscordChannel, DiscordMessage } from '@/types';
import { config } from '@/utils/config';
import { PerformanceTracker } from '@/utils/performance';
import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '../db';
import { MessageProcessor } from '../message/processor';

// API Limits
const MAX_REQUESTS_PER_SECOND = 48;
const REQUEST_WINDOW_MS = 1000;
const DEFAULT_BATCH_SIZE = 100;

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
    private cachedChannels: DiscordChannel[] | null = null;
    private lastChannelFetch = 0;

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

    cleanup() {
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.messageProcessor = undefined;
    }

    private async executeRequest<T>(request: () => Promise<T>, retries = 2): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                let lastError: Error | null = null;

                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const result = await request();
                        resolve(result);
                        return;
                    } catch (error) {
                        lastError = error as Error;
                        if (attempt < retries) {
                            // Exponential backoff
                            await new Promise(resolve =>
                                setTimeout(resolve, Math.pow(2, attempt) * 1000)
                            );
                        }
                    }
                }

                reject(lastError);
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
            // Cache check (5 minute TTL)
            const now = Date.now();
            if (this.cachedChannels && (now - this.lastChannelFetch) < 300000) {
                return this.cachedChannels;
            }

            const response = await this.executeRequest(() =>
                this.api.get(`/guilds/${config.GUILD_ID}/channels`)
            );

            // One-pass filtering with Set for O(1) lookups
            const allowedEmojis = new Set(['🟡', '🔴', '🟠', '⚫']);
            const filteredChannels = response.data.filter((channel: DiscordChannel) => {
                if (channel.type !== 0) return false;
                if (channel.parent_id === '1112044935982633060') return true;
                if (!channel.name || channel.name.includes('godly-chat')) return false;
                if ((channel.position || 0) >= 30) return false;

                const firstChar = Array.from(channel.name)[0];
                return allowedEmojis.has(firstChar);
            });

            // Update cache
            this.cachedChannels = filteredChannels;
            this.lastChannelFetch = now;

            return filteredChannels;
        } catch (error) {
            console.error('Error fetching channels:', error);
            throw new Error('Failed to fetch Discord channels');
        }
    }

    async fetchMessageBatch(
        channelId: string,
        lastMessageId?: string,
        batchSize: number = DEFAULT_BATCH_SIZE
    ): Promise<DiscordMessage[]> {
        return PerformanceTracker.track('discord.fetchBatch', async () => {
            try {
                const params = new URLSearchParams({
                    limit: Math.min(batchSize, DEFAULT_BATCH_SIZE).toString()
                });
                if (lastMessageId) {
                    params.append('before', lastMessageId);
                }

                const response = await this.executeRequest(() =>
                    this.api.get(`/channels/${channelId}/messages?${params.toString()}`)
                );

                return response.data;
            } catch (error) {
                const err = error as Error;
                console.error('Error fetching message batch:', err.message);
                throw new Error(`Failed to fetch Discord messages: ${err.message}`);
            }
        }, { channelId, lastMessageId, batchSize });
    }

    async fetchMessagesInTimeframe(
        channelId: string,
        hours: number = 24,
        lastMessageId?: string,
        topicId?: string,
        batchSize: number = DEFAULT_BATCH_SIZE
    ): Promise<DiscordMessage[]> {
        return PerformanceTracker.track('discord.fetchTimeframe', async () => {
            let currentLastMessageId = lastMessageId;
            let batchCount = 0;
            let totalMessages = 0;
            let allMessages: DiscordMessage[] = [];

            // Calculate cutoff time
            const cutoffTime = new Date();
            cutoffTime.setHours(cutoffTime.getHours() - hours);

            const channelName = this.channelNames.get(channelId) || channelId;
            const timeframeStr = `${hours}h`;

            while (true) {
                const batch = await this.fetchMessageBatch(channelId, currentLastMessageId, batchSize);
                batchCount++;

                if (!batch || batch.length === 0) break;
                totalMessages += batch.length;

                // Process batch and get bot messages
                const batchMessages = batch.filter(msg =>
                    msg.author?.username === 'FaytuksBot' &&
                    msg.author?.discriminator === '7032' &&
                    new Date(msg.timestamp) >= cutoffTime
                );

                // Add filtered messages to result
                allMessages.push(...batchMessages);

                // Process messages in database if needed
                if (this.messageProcessor && topicId && batchMessages.length > 0) {
                    await this.messageProcessor.processBatch(batchMessages, topicId);
                }

                // Notify about the batch
                if (this.onMessageBatch) {
                    await this.onMessageBatch(batch.length, batchMessages.length, batchMessages);
                }

                // Check if we should stop
                const lastMsgTime = new Date(batch[batch.length - 1].timestamp);
                if (lastMsgTime < cutoffTime) break;

                currentLastMessageId = batch[batch.length - 1].id;

                // Memory management: clear processed messages
                batch.length = 0;
            }

            console.log(
                `[${channelName}|${timeframeStr}] Processed ${totalMessages} messages in ${batchCount} batches`
            );

            return allMessages;
        }, {
            channelId,
            timeframe: `${hours}h`,
            channelName: this.channelNames.get(channelId)
        });
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