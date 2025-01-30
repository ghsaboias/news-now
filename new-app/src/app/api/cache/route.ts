import { redisClient } from '@/services/redis/client';
import { KEYS } from '@/services/redis/keys';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type');
        const channelId = searchParams.get('channelId');
        const timeframe = searchParams.get('timeframe');

        // Initialize Redis pipeline for batch operations
        const pipeline = redisClient.redis.pipeline();

        switch (type) {
            case 'all':
                // Clear all caches
                await redisClient.redis.flushdb();
                break;

            case 'reports':
                if (channelId && timeframe) {
                    // Clear specific report cache
                    pipeline.del(`report:${channelId}:${timeframe}`);
                } else if (channelId) {
                    // Clear all reports for a channel
                    const pattern = `report:${channelId}:*`;
                    const keys = await redisClient.redis.keys(pattern);
                    if (keys.length > 0) {
                        pipeline.del(...keys);
                    }
                } else {
                    // Clear all report caches
                    const pattern = 'report:*';
                    const keys = await redisClient.redis.keys(pattern);
                    if (keys.length > 0) {
                        pipeline.del(...keys);
                    }
                }
                break;

            case 'channel-status':
                if (channelId) {
                    // Clear specific channel status
                    pipeline.del(KEYS.CHANNEL.STATUS(channelId));
                    pipeline.del(KEYS.CHANNEL.PROGRESS(channelId));
                } else {
                    // Clear all channel statuses
                    const statusKeys = await redisClient.redis.keys('channel:*:status');
                    const progressKeys = await redisClient.redis.keys('channel:*:progress');
                    if (statusKeys.length > 0) pipeline.del(...statusKeys);
                    if (progressKeys.length > 0) pipeline.del(...progressKeys);
                }
                break;

            case 'generation':
                if (channelId && timeframe) {
                    // Clear specific generation status
                    pipeline.del(KEYS.GENERATION.STATUS(`${channelId}:${timeframe}`));
                    pipeline.del(KEYS.GENERATION.PROGRESS(`${channelId}:${timeframe}`));
                } else {
                    // Clear all generation statuses
                    const statusKeys = await redisClient.redis.keys('generation:*:status');
                    const progressKeys = await redisClient.redis.keys('generation:*:progress');
                    if (statusKeys.length > 0) pipeline.del(...statusKeys);
                    if (progressKeys.length > 0) pipeline.del(...progressKeys);
                }
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid cache type specified' },
                    { status: 400 }
                );
        }

        // Execute pipeline if any commands were added
        if (pipeline.length > 0) {
            await pipeline.exec();
        }

        return NextResponse.json(
            { message: 'Cache cleared successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error clearing cache:', error);
        return NextResponse.json(
            { error: 'Failed to clear cache' },
            { status: 500 }
        );
    }
} 