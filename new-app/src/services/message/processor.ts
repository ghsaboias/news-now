import { DiscordMessage, MessageProcessingResult } from '@/types/discord';
import { Message } from '@/types/redis';
import { MessageService } from '../redis/messages';
import { SourceService } from '../redis/sources';
import { SourceExtractor } from '../source/extractor';

export class MessageProcessor {
    private sourceExtractor: SourceExtractor;
    private messageService: MessageService;

    constructor(messageService: MessageService, sourceService: SourceService) {
        this.sourceExtractor = new SourceExtractor(sourceService);
        this.messageService = messageService;
    }

    async processMessage(message: DiscordMessage, topicId: string): Promise<MessageProcessingResult> {
        try {
            message.status = 'processing';

            // Extract source information (modifies message directly)
            const hasSource = await this.sourceExtractor.extractFromMessage(message);
            if (!hasSource) {
                console.log('No source found for message:', message.id);
                message.status = 'error';
                return {
                    messageId: message.id,
                    success: false,
                    error: 'No source found'
                };
            }

            // Get topic prefix from topic_id for message ID
            const topicPrefix = topicId.split('_')[1] || 'unknown';
            const messageId = `msg_${topicPrefix}_${message.id}`;

            // Create message record
            const storedMessage = {
                id: messageId,
                topic_id: topicId,
                content: message.content,
                platform: message.platform,
                handle: message.handle,
                embed_title: message.embeds?.[0]?.title || '',
                embed_description: message.embeds?.[0]?.description || '',
                timestamp: message.timestamp
            };

            // Store message in Redis
            await this.messageService.create(storedMessage as Message, []);
            message.status = 'success';

            return {
                messageId,
                platform: message.platform as 'telegram' | 'x',
                handle: message.handle,
                success: true
            };
        } catch (error) {
            console.error('Error processing message:', error);
            message.status = 'error';
            return {
                messageId: message.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async processBatch(messages: DiscordMessage[], topicId: string): Promise<DiscordMessage[]> {
        const results: DiscordMessage[] = [];

        for (const message of messages) {
            try {
                await this.processMessage(message, topicId);
                results.push(message);

                if (results.length % 10 === 0) {
                    console.log(`Processed ${results.length}/${messages.length} messages`);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                message.status = 'error';
                results.push(message);
            }
        }

        const successCount = results.filter(m => m.status === 'success').length;
        console.log(`Completed processing batch. Successfully processed ${successCount}/${messages.length} messages`);
        return results;
    }
} 