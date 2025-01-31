import { Message, MessageField } from '@/types/redis';
import { redisClient } from './client';

const KEYS = {
    MESSAGE: {
        SINGLE: (id: string) => `message:${id}`,
        FIELDS: (id: string) => `message:${id}:fields`,
        BY_TOPIC: (topicId: string) => `messages:by-topic:${topicId}`,
        BY_SOURCE: (sourceId: string) => `messages:by-source:${sourceId}`,
    }
} as const;

export class MessageService {
    async create(message: Message, fields: MessageField[] = []): Promise<void> {
        const pipeline = redisClient.redis.pipeline();

        // Store message data
        pipeline.hset(
            KEYS.MESSAGE.SINGLE(message.id),
            {
                topic_id: message.topic_id,
                source_id: message.source_id,
                content: message.content,
                embed_title: message.embed_title || '',
                embed_description: message.embed_description || '',
                timestamp: message.timestamp
            }
        );

        // Store message fields if any
        if (fields.length > 0) {
            const fieldData = fields.reduce((acc, field) => ({
                ...acc,
                [field.name]: field.value
            }), {});

            pipeline.hset(KEYS.MESSAGE.FIELDS(message.id), fieldData);
        }

        // Add to topic index
        pipeline.zadd(
            KEYS.MESSAGE.BY_TOPIC(message.topic_id),
            new Date(message.timestamp).getTime(),
            message.id
        );

        // Add to source index
        pipeline.zadd(
            KEYS.MESSAGE.BY_SOURCE(message.source_id),
            new Date(message.timestamp).getTime(),
            message.id
        );

        await pipeline.exec();
    }

    async getById(id: string): Promise<Message | null> {
        const data = await redisClient.redis.hgetall(KEYS.MESSAGE.SINGLE(id));
        if (!data || !Object.keys(data).length) return null;

        return {
            id,
            topic_id: data.topic_id,
            source_id: data.source_id,
            content: data.content,
            embed_title: data.embed_title || undefined,
            embed_description: data.embed_description || undefined,
            timestamp: data.timestamp
        };
    }

    async getFields(messageId: string): Promise<MessageField[]> {
        const data = await redisClient.redis.hgetall(KEYS.MESSAGE.FIELDS(messageId));
        if (!data || !Object.keys(data).length) return [];

        return Object.entries(data).map(([name, value]) => ({
            message_id: messageId,
            name,
            value
        }));
    }

    async getByTopic(topicId: string, limit = 100): Promise<Message[]> {
        // Get message IDs from topic index, ordered by timestamp desc
        const messageIds = await redisClient.redis.zrevrange(
            KEYS.MESSAGE.BY_TOPIC(topicId),
            0,
            limit - 1
        );

        // Fetch all messages
        const messages = await Promise.all(
            messageIds.map(id => this.getById(id))
        );

        // Filter out any null results (should not happen in normal operation)
        return messages.filter((message): message is Message => message !== null);
    }

    async getBySource(sourceId: string, limit = 100): Promise<Message[]> {
        // Get message IDs from source index, ordered by timestamp desc
        const messageIds = await redisClient.redis.zrevrange(
            KEYS.MESSAGE.BY_SOURCE(sourceId),
            0,
            limit - 1
        );

        // Fetch all messages
        const messages = await Promise.all(
            messageIds.map(id => this.getById(id))
        );

        // Filter out any null results (should not happen in normal operation)
        return messages.filter((message): message is Message => message !== null);
    }

    async getAll(): Promise<Message[]> {
        // This is a potentially expensive operation, use with caution
        // Consider implementing pagination if needed
        const keys = await redisClient.redis.keys(KEYS.MESSAGE.SINGLE('*'));
        const messages = await Promise.all(
            keys.map(key => {
                const id = key.split(':').pop() || '';
                return this.getById(id);
            })
        );

        return messages
            .filter((message): message is Message => message !== null)
            .sort((a, b) => {
                const dateA = new Date(a.timestamp);
                const dateB = new Date(b.timestamp);
                return dateB.getTime() - dateA.getTime();
            });
    }
} 