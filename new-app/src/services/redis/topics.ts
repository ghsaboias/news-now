import { Topic } from '@/types';
import { redisClient } from './client';

const KEYS = {
    TOPIC: {
        SINGLE: (id: string) => `topic:${id}`,
        BY_NAME: 'topics:by-name',
    }
} as const;

export class TopicService {
    async create(topic: Topic): Promise<void> {
        const pipeline = redisClient.redis.pipeline();

        // Store topic data
        pipeline.hset(
            KEYS.TOPIC.SINGLE(topic.id),
            {
                name: topic.name,
                created_at: topic.created_at || new Date().toISOString()
            }
        );

        // Add to name index
        pipeline.zadd(
            KEYS.TOPIC.BY_NAME,
            0, // Score doesn't matter for name lookups
            `${topic.name}:${topic.id}`
        );

        await pipeline.exec();
    }

    async getById(id: string): Promise<Topic | null> {
        const data = await redisClient.redis.hgetall(KEYS.TOPIC.SINGLE(id));
        if (!data || !Object.keys(data).length) return null;

        return {
            id,
            name: data.name,
            created_at: data.created_at
        };
    }

    async getByName(name: string): Promise<Topic | null> {
        // Get all topics with this name (should be at most one)
        const results = await redisClient.redis.zrangebylex(
            KEYS.TOPIC.BY_NAME,
            `[${name}:`,
            `[${name}:\xff`
        );

        if (!results.length) return null;

        // Extract ID from the first result
        const id = results[0].split(':')[1];
        return this.getById(id);
    }

    async getAll(): Promise<Topic[]> {
        // Get all topic IDs from the name index
        const members = await redisClient.redis.zrange(KEYS.TOPIC.BY_NAME, 0, -1);

        // Extract IDs and fetch topics
        const ids = members.map(member => member.split(':')[1]);
        const topics = await Promise.all(
            ids.map(id => this.getById(id))
        );

        // Filter out any null results and sort by created_at
        return topics
            .filter((topic): topic is Topic => topic !== null)
            .sort((a, b) => {
                const dateA = new Date(a.created_at || '');
                const dateB = new Date(b.created_at || '');
                return dateB.getTime() - dateA.getTime();
            });
    }
} 