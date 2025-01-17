import { DiscordChannel, DiscordMessage } from '@/types';
import { config } from '@/utils/config';
import axios, { AxiosInstance } from 'axios';

export class DiscordClient {
    private readonly api: AxiosInstance;
    private readonly baseUrl = 'https://discord.com/api/v10';
    public onMessageBatch?: (batchSize: number, botMessages: number, messages: DiscordMessage[]) => Promise<void>;

    constructor() {
        this.api = axios.create({
            baseURL: this.baseUrl,
            headers: {
                Authorization: config.DISCORD_TOKEN,
                'Content-Type': 'application/json',
            },
            timeout: config.REQUEST_TIMEOUT,
        });
    }

    async fetchChannels(): Promise<DiscordChannel[]> {
        try {
            const response = await this.api.get(`/guilds/${config.GUILD_ID}/channels`);
            const channels = response.data;

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

            const response = await this.api.get(
                `/channels/${channelId}/messages?${params.toString()}`
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
        minutes?: number
    ): Promise<DiscordMessage[]> {
        const messages: DiscordMessage[] = [];
        let lastMessageId: string | undefined;

        // Calculate cutoff time based on hours or minutes
        const cutoffTime = new Date();
        if (minutes !== undefined) {
            cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);
            console.log(`Fetching messages from channel ${channelId} for past ${minutes} minutes`);
        } else {
            cutoffTime.setHours(cutoffTime.getHours() - hours);
            console.log(`Fetching messages from channel ${channelId} for past ${hours} hours`);
        }

        while (true) {
            const batch = await this.fetchMessageBatch(channelId, lastMessageId);

            if (!batch || batch.length === 0) {
                break;
            }

            // Process batch and get bot messages
            let batchBotMessages = 0;
            const batchMessages: DiscordMessage[] = [];

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

            // Notify about the batch if handler exists
            if (this.onMessageBatch) {
                await this.onMessageBatch(batch.length, batchBotMessages, batchMessages);
            }

            console.log(`Processed batch of ${batch.length} messages, found ${batchBotMessages} bot messages`);

            // Check if we should stop
            const lastMsgTime = new Date(batch[batch.length - 1].timestamp);
            if (lastMsgTime < cutoffTime) {
                break;
            }

            lastMessageId = batch[batch.length - 1].id;

            // Memory management: If we've collected too many messages, break
            if (messages.length >= config.MAX_BATCH_SIZE) {
                console.warn(`Reached maximum batch size of ${config.MAX_BATCH_SIZE} messages`);
                break;
            }
        }

        console.log(`Total bot messages found: ${messages.length}`);
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