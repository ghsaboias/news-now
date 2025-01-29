import Redis from 'ioredis';

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
            lazyConnect: true, // Don't connect immediately
            // Production settings
            showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
            enableOfflineQueue: true,
            connectTimeout: 10000,
            keepAlive: 30000,
            family: 4, // IPv4
            keyPrefix: process.env.REDIS_PREFIX || 'newsnow:'
        };

        // Main client for commands
        this.redis = new Redis(config);
        this.subscriber = new Redis(config);

        // Connection handling
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

        // Handle process termination
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

    // Wrap Redis operations with connection check
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        await this.ensureConnection();
        try {
            return await operation();
        } catch (err) {
            console.error('Redis operation failed:', err);
            throw err;
        }
    }

    // Report caching methods
    async cacheReport(channelId: string, timeframe: string, report: any) {
        return this.execute(async () => {
            const key = `report:${channelId}:${timeframe}`;
            await this.redis.set(key, JSON.stringify(report), 'EX', 3600); // 1 hour expiry
        });
    }

    async getCachedReport(channelId: string, timeframe: string) {
        const key = `report:${channelId}:${timeframe}`;
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    // Active generation tracking
    async trackGeneration(channelId: string, timeframe: string) {
        const key = `generation:${channelId}:${timeframe}`;
        await this.redis.set(key, JSON.stringify({
            startedAt: new Date().toISOString(),
            status: 'running'
        }), 'EX', 300); // 5 minutes expiry
    }

    async updateGenerationProgress(channelId: string, timeframe: string, progress: number) {
        const key = `generation:${channelId}:${timeframe}`;
        await this.redis.set(key, JSON.stringify({
            startedAt: new Date().toISOString(),
            status: 'running',
            progress
        }), 'EX', 300);
    }

    // Channel status tracking
    async updateChannelStatus(channelId: string, status: 'active' | 'idle') {
        const key = `channel:${channelId}:status`;
        await this.redis.set(key, status, 'EX', 60); // 1 minute expiry
    }

    // Pub/Sub methods
    async publish(channel: string, message: unknown) {
        await this.redis.publish(channel, JSON.stringify(message));
    }

    onMessage(channel: string, callback: (message: unknown) => void) {
        this.subscriber.subscribe(channel);
        this.subscriber.on('message', (ch: string, message: string) => {
            if (ch === channel) {
                callback(JSON.parse(message));
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
