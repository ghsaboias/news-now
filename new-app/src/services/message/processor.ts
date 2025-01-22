import { DiscordMessage } from '@/types';
import { SourceExtractorMessage } from '@/types/source';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../db';
import { SourceExtractor } from '../source/extractor';

export class MessageProcessor {
    private sourceExtractor: SourceExtractor;

    constructor(private db: DatabaseService) {
        this.sourceExtractor = new SourceExtractor(db);
    }

    async processMessage(message: DiscordMessage, topicId: string): Promise<void> {
        // Cast message to SourceExtractorMessage since we know it has embeds
        const extractorMessage = message as unknown as SourceExtractorMessage;

        console.log('Processing message:', { id: message.id, embeds: extractorMessage.embeds?.length });

        // Extract source information
        const source = this.sourceExtractor.extractFromMessage(extractorMessage);
        if (!source) {
            console.log('No source extracted from message');
            return;
        }
        console.log('Source extracted:', source);

        // Get topic prefix from topic_id for message ID
        const topicPrefix = topicId.split('_')[1]; // Gets the channel name part
        const messageId = `msg_${topicPrefix}_${uuidv4()}`;

        // Create message record
        const dbMessage = {
            id: messageId,
            topic_id: topicId,
            source_id: source.id,
            content: message.content,
            embed_title: extractorMessage.embeds[0]?.title || '',
            embed_description: extractorMessage.embeds[0]?.description || '',
            timestamp: message.timestamp
        };

        // Extract fields from embeds with descriptive IDs
        const fields = extractorMessage.embeds[0]?.fields?.map(field => ({
            message_id: messageId,
            name: field.name,
            value: field.value
        })) || [];

        console.log('Storing message:', { id: messageId, fields: fields.length });

        // Store message and fields in database
        this.db.insertMessage(dbMessage, fields);
    }

    async processBatch(messages: DiscordMessage[], topicId: string): Promise<number> {
        let processedCount = 0;
        console.log(`Starting to process batch of ${messages.length} messages for topic ${topicId}`);

        for (const message of messages) {
            try {
                await this.processMessage(message, topicId);
                processedCount++;
                if (processedCount % 10 === 0) {
                    console.log(`Processed ${processedCount}/${messages.length} messages`);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                // Continue processing other messages even if one fails
            }
        }

        console.log(`Completed processing batch. Successfully processed ${processedCount}/${messages.length} messages`);
        return processedCount;
    }
} 