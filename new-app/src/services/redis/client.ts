import { Report } from '@/types/report';
import Redis from 'ioredis';
import { KEYS, TTL } from './keys';

export class RedisClient {
    public redis: Redis;
    private subscriber: Redis;
    private isConnected: boolean = false;

    constructor() {
        const config = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
            maxRetriesPerRequest: 3,
            retryStrategy: (times: number) => {
                const delay = Math.min(times * 50, 2000);
                console.log(`Retrying Redis connection in ${delay}ms...`);
                return delay;
            },
            commandTimeout: 5000,
            enableReadyCheck: true,
            reconnectOnError: (err: Error) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
            lazyConnect: true,
            showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
            enableOfflineQueue: true,
            connectTimeout: 10000,
            keepAlive: 30000,
            family: 4
        };

        this.redis = new Redis(config);
        this.subscriber = new Redis(config);

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.redis.on('connect', () => {
            const host = process.env.REDIS_HOST || 'localhost';
            console.log(`Redis connected to ${host}`);
            this.isConnected = true;
        });

        this.redis.on('error', (err: Error) => {
            console.error('Redis error:', err);
            this.isConnected = false;
        });

        this.redis.on('close', () => {
            console.log('Redis connection closed');
            this.isConnected = false;
        });

        process.on('SIGTERM', () => this.close());
        process.on('SIGINT', () => this.close());
    }

    async ensureConnection() {
        if (!this.isConnected) {
            try {
                await this.redis.connect();
            } catch (err) {
                console.error('Failed to connect to Redis:', err);
                throw new Error('Redis connection failed');
            }
        }
    }

    async execute<T>(operation: () => Promise<T>): Promise<T> {
        await this.ensureConnection();
        try {
            return await operation();
        } catch (err) {
            console.error('Redis operation failed:', err);
            throw err;
        }
    }

    // Report caching methods with new key structure
    async cacheReport(channelId: string, timeframe: string, report: Report) {
        return this.execute(async () => {
            const key = KEYS.CACHE.REPORT(channelId, timeframe);
            const pipeline = this.redis.pipeline();

            // Store the report in cache
            pipeline.set(
                key,
                JSON.stringify(report),
                'EX',
                TTL.REPORT.CACHE
            );

            // Add to channel index
            pipeline.zadd(
                KEYS.REPORT.BY_CHANNEL(channelId),
                new Date(report.timestamp).getTime(),
                report.id
            );

            // Add to date index
            const date = new Date(report.timestamp).toISOString().split('T')[0];
            pipeline.zadd(
                KEYS.REPORT.BY_DATE(date),
                new Date(report.timestamp).getTime(),
                report.id
            );

            await pipeline.exec();
        });
    }

    async getCachedReport(channelId: string, timeframe: string) {
        const key = KEYS.CACHE.REPORT(channelId, timeframe);
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    // Generation tracking with new key structure
    async trackGeneration(channelId: string, timeframe: string) {
        const key = KEYS.GENERATION.STATUS(channelId);
        await this.redis.set(
            key,
            JSON.stringify({
                startedAt: new Date().toISOString(),
                status: 'running',
                timeframe
            }),
            'EX',
            TTL.GENERATION.STATUS
        );
    }

    async updateGenerationProgress(channelId: string, timeframe: string, progress: number) {
        const key = KEYS.GENERATION.PROGRESS(channelId);
        await this.redis.set(
            key,
            JSON.stringify({
                startedAt: new Date().toISOString(),
                status: 'running',
                timeframe,
                progress
            }),
            'EX',
            TTL.GENERATION.PROGRESS
        );
    }

    // Channel status tracking with new key structure
    async updateChannelStatus(channelId: string, status: 'active' | 'idle') {
        const key = KEYS.CHANNEL.STATUS(channelId);
        await this.redis.set(key, status, 'EX', TTL.CHANNEL.STATUS);
    }

    // Pub/Sub methods
    async publish(channel: string, message: unknown) {
        await this.redis.publish(channel, JSON.stringify(message));
    }

    onMessage(channel: string, callback: (message: unknown) => void) {
        this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch: string, message: string) => {
            if (ch === channel) {
                try {
                    callback(JSON.parse(message));
                } catch (error) {
                    console.error('Failed to parse message:', error);
                }
            }
        });
    }

    // Cleanup
    async close() {
        await this.redis.quit();
        await this.subscriber.quit();
        this.isConnected = false;
    }
}

// Export singleton instance
export const redisClient = new RedisClient(); 
