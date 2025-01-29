import { redisClient } from '@/services/redis/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { channelId, timeframe, progress } = await request.json();

        if (!channelId || !timeframe || typeof progress !== 'number') {
            return NextResponse.json(
                { error: 'Channel ID, timeframe, and progress are required' },
                { status: 400 }
            );
        }

        await redisClient.updateGenerationProgress(channelId, timeframe, progress);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating generation progress:', error);
        return NextResponse.json(
            { error: 'Failed to update generation progress' },
            { status: 500 }
        );
    }
} 