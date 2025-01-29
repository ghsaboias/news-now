import { redisClient } from '@/services/redis/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { channelId, timeframe, status } = await request.json();

        if (!channelId || !timeframe || !status) {
            return NextResponse.json(
                { error: 'Channel ID, timeframe, and status are required' },
                { status: 400 }
            );
        }

        if (status === 'started') {
            await redisClient.trackGeneration(channelId, timeframe);
            await redisClient.updateChannelStatus(channelId, 'active');
        } else if (status === 'completed') {
            await redisClient.updateChannelStatus(channelId, 'idle');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error tracking report generation:', error);
        return NextResponse.json(
            { error: 'Failed to track report generation' },
            { status: 500 }
        );
    }
} 