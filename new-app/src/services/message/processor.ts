import { DiscordMessage, MessageProcessingResult, ProcessedMessage, StoredMessage } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../db';
import { SourceExtractor } from '../source/extractor';

export class MessageProcessor {
    private sourceExtractor: SourceExtractor;

    constructor(private db: DatabaseService) {
        this.sourceExtractor = new SourceExtractor(db);
    }

    async processMessage(message: DiscordMessage, topicId: string): Promise<MessageProcessingResult> {
        console.log('Processing message:', {
            id: message.id,
            embeds: message.embeds?.length
        });

        try {
            // Extract source information
            const source = this.sourceExtractor.extractFromMessage(message);
            console.log('Source extracted:', source);

            // Get topic prefix from topic_id for message ID
            const topicPrefix = topicId.split('_')[1] || 'unknown'; // Gets the channel name part
            const messageId = `msg_${topicPrefix}_${message.id}_${uuidv4()}`;

            // Create message record
            const storedMessage: StoredMessage = {
                id: messageId,
                topic_id: topicId,
                discord_message_id: message.id,
                source_id: source?.id || '',
                content: message.content,
                embed_title: message.embeds?.[0]?.title || '',
                embed_description: message.embeds?.[0]?.description || '',
                embed_fields: message.embeds?.[0]?.fields,
                timestamp: message.timestamp
            };

            // Extract fields from embeds with descriptive IDs
            const fields = message.embeds?.[0]?.fields?.map(field => ({
                message_id: messageId,
                name: field.name,
                value: field.value
            })) || [];

            console.log('Storing message:', { id: messageId, fields: fields.length });

            // Store message and fields in database
            await this.db.insertMessage(storedMessage, fields);

            return {
                messageId,
                sourceId: source?.id,
                embedCount: message.embeds?.length || 0,
                success: true
            };
        } catch (error) {
            console.error('Error processing message:', error);
            return {
                messageId: message.id,
                embedCount: message.embeds?.length || 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async processBatch(messages: DiscordMessage[], topicId: string): Promise<ProcessedMessage[]> {
        const results: ProcessedMessage[] = [];
        console.log(`Starting to process batch of ${messages.length} messages for topic ${topicId}`);

        for (const message of messages) {
            try {
                const result = await this.processMessage(message, topicId);
                results.push({
                    id: result.messageId,
                    content: message.content,
                    hasEmbeds: (message.embeds?.length || 0) > 0,
                    embedCount: message.embeds?.length || 0,
                    sourceInfo: result.sourceId ? await this.sourceExtractor.getSourceById(result.sourceId) : undefined,
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
                    embedCount: message.embeds?.length || 0,
                    status: 'error'
                });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        console.log(`Completed processing batch. Successfully processed ${successCount}/${messages.length} messages`);
        return results;
    }
} 