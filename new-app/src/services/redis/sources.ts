import { Source } from '@/types';
import { redisClient } from './client';

const KEYS = {
    SOURCE: {
        SINGLE: (id: string) => `source:${id}`,
        BY_PLATFORM: (platform: string) => `sources:by-platform:${platform}`,
        BY_HANDLE: (platform: string, handle: string) => `sources:by-handle:${platform}:${handle}`,
    }
} as const;

export class SourceService {
    async create(source: Source): Promise<void> {
        const pipeline = redisClient.redis.pipeline();

        // Store source data
        pipeline.hset(
            KEYS.SOURCE.SINGLE(source.id),
            {
                platform: source.platform,
                handle: source.handle,
                first_seen_at: source.first_seen_at,
                last_seen_at: source.last_seen_at
            }
        );

        // Add to platform index
        pipeline.zadd(
            KEYS.SOURCE.BY_PLATFORM(source.platform),
            new Date(source.first_seen_at).getTime(),
            source.id
        );

        // Add to handle lookup
        pipeline.set(
            KEYS.SOURCE.BY_HANDLE(source.platform, source.handle),
            source.id
        );

        await pipeline.exec();
    }

    async getById(id: string): Promise<Source | null> {
        const data = await redisClient.redis.hgetall(KEYS.SOURCE.SINGLE(id));
        if (!data || !Object.keys(data).length) return null;

        return {
            id,
            platform: data.platform as 'telegram' | 'x',
            handle: data.handle,
            first_seen_at: data.first_seen_at,
            last_seen_at: data.last_seen_at
        };
    }

    async getByHandle(platform: 'telegram' | 'x', handle: string): Promise<Source | null> {
        const id = await redisClient.redis.get(KEYS.SOURCE.BY_HANDLE(platform, handle));
        if (!id) return null;

        return this.getById(id);
    }

    async getAll(): Promise<Source[]> {
        // Get all sources from both platforms
        const platforms: ('telegram' | 'x')[] = ['telegram', 'x'];
        const sourceIds = await Promise.all(
            platforms.map(platform =>
                redisClient.redis.zrange(KEYS.SOURCE.BY_PLATFORM(platform), 0, -1)
            )
        );

        // Flatten and fetch all sources
        const allIds = sourceIds.flat();
        const sources = await Promise.all(
            allIds.map(id => this.getById(id))
        );

        // Filter out any null results and sort by first_seen_at
        return sources
            .filter((source): source is Source => source !== null)
            .sort((a, b) => {
                const dateA = new Date(a.first_seen_at);
                const dateB = new Date(b.first_seen_at);
                return dateB.getTime() - dateA.getTime();
            });
    }
} 