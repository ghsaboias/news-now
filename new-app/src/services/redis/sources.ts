import { redisClient } from './client';

interface SourceInfo {
    platform: 'telegram' | 'x';
    handle: string;
    first_seen_at: string;
    last_seen_at: string;
}

const KEYS = {
    SOURCE: {
        BY_PLATFORM: (platform: string) => `sources:by-platform:${platform}`,
        BY_HANDLE: (platform: string, handle: string) => `sources:by-handle:${platform}:${handle}`,
    }
} as const;

export class SourceService {
    async create(source: { platform: 'telegram' | 'x', handle: string, timestamp: string }): Promise<void> {
        const key = KEYS.SOURCE.BY_HANDLE(source.platform, source.handle);
        const existing = await redisClient.redis.hgetall(key);

        const data = {
            platform: source.platform,
            handle: source.handle,
            first_seen_at: existing.first_seen_at || source.timestamp,
            last_seen_at: source.timestamp
        };

        const pipeline = redisClient.redis.pipeline();

        // Store source data
        pipeline.hset(key, data);

        // Add to platform index
        pipeline.zadd(
            KEYS.SOURCE.BY_PLATFORM(source.platform),
            new Date(data.first_seen_at).getTime(),
            `${source.platform}:${source.handle}`
        );

        await pipeline.exec();
    }

    async getByHandle(platform: 'telegram' | 'x', handle: string): Promise<SourceInfo | null> {
        const data = await redisClient.redis.hgetall(KEYS.SOURCE.BY_HANDLE(platform, handle));
        if (!data || !Object.keys(data).length) return null;

        return {
            platform: platform,
            handle: handle,
            first_seen_at: data.first_seen_at,
            last_seen_at: data.last_seen_at
        };
    }

    async getAll(): Promise<SourceInfo[]> {
        // Get all sources from both platforms
        const platforms: ('telegram' | 'x')[] = ['telegram', 'x'];
        const sourceKeys = await Promise.all(
            platforms.map(platform =>
                redisClient.redis.zrange(KEYS.SOURCE.BY_PLATFORM(platform), 0, -1)
            )
        );

        // Flatten and fetch all sources
        const allSources = await Promise.all(
            sourceKeys.flat().map(key => {
                const [platform, handle] = key.split(':') as ['telegram' | 'x', string];
                return this.getByHandle(platform, handle);
            })
        );

        // Filter out any null results and sort by first_seen_at
        return allSources
            .filter((source): source is SourceInfo => source !== null)
            .sort((a, b) => {
                const dateA = new Date(a.first_seen_at);
                const dateB = new Date(b.first_seen_at);
                return dateB.getTime() - dateA.getTime();
            });
    }
} 