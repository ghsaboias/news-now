import { MessageProcessingResult, OptimizedMessage, ProcessedMessage } from '@/types/discord';
import { v4 as uuidv4 } from 'uuid';
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

    async processMessage(message: OptimizedMessage, topicId: string): Promise<MessageProcessingResult> {
        try {
            // Extract source information
            const source = await this.sourceExtractor.extractFromMessage(message);
            if (!source) {
                console.log('No source found for message:', message.id);
                return {
                    messageId: message.id,
                    embed_title: message.embeds?.[0]?.title || '',
                    embed_description: message.embeds?.[0]?.description || '',
                    success: false,
                    error: 'No source found'
                };
            }

            // Get topic prefix from topic_id for message ID
            const topicPrefix = topicId.split('_')[1] || 'unknown'; // Gets the channel name part
            const messageId = `msg_${topicPrefix}_${message.id}_${uuidv4()}`;

            // Create message record
            const storedMessage = {
                id: messageId,
                topic_id: topicId,
                source_id: source.id,
                content: message.content,
                embed_title: message.embeds?.[0]?.title || '',
                embed_description: message.embeds?.[0]?.description || '',
                timestamp: message.timestamp
            };

            // Store message in Redis (without fields since OptimizedMessage doesn't have them)
            await this.messageService.create(storedMessage, []);

            return {
                messageId,
                sourceId: source.id,
                embed_title: message.embeds?.[0]?.title || '',
                embed_description: message.embeds?.[0]?.description || '',
                success: true
            };
        } catch (error) {
            console.error('Error processing message:', error);
            return {
                messageId: message.id,
                embed_title: message.embeds?.[0]?.title || '',
                embed_description: message.embeds?.[0]?.description || '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async processBatch(messages: OptimizedMessage[], topicId: string): Promise<ProcessedMessage[]> {
        const results: ProcessedMessage[] = [];
        console.log(`Starting to process batch of ${messages.length} messages for topic ${topicId}`);

        for (const message of messages) {
            try {
                const result = await this.processMessage(message, topicId);
                const sourceInfo = result.sourceId ? await this.sourceExtractor.getSourceById(result.sourceId) : undefined;

                results.push({
                    id: result.messageId,
                    content: message.content,
                    hasEmbeds: (message.embeds?.length || 0) > 0,
                    embed_title: message.embeds?.[0]?.title || '',
                    embed_description: message.embeds?.[0]?.description || '',
                    sourceInfo: sourceInfo || undefined,
                    status: result.success ? 'success' : 'error'
                });

                if (results.length % 10 === 0) {
                    console.log(`Processed ${results.length}/${messages.length} messages`);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                results.push({
                    id: message.id,
                    content: message.content,
                    hasEmbeds: (message.embeds?.length || 0) > 0,
                    embed_title: message.embeds?.[0]?.title || '',
                    embed_description: message.embeds?.[0]?.description || '',
                    status: 'error'
                });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        console.log(`Completed processing batch. Successfully processed ${successCount}/${messages.length} messages`);
        return results;
    }
} 