import { redisClient } from '@/services/redis/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const channelId = searchParams.get('channelId');
        const timeframe = searchParams.get('timeframe');

        if (!channelId || !timeframe) {
            return NextResponse.json(
                { error: 'Channel ID and timeframe are required' },
                { status: 400 }
            );
        }

        const cachedReport = await redisClient.getCachedReport(channelId, timeframe);
        return NextResponse.json({ data: cachedReport });
    } catch (error) {
        console.error('Error fetching cached report:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cached report' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { channelId, timeframe, report } = await request.json();

        if (!channelId || !timeframe || !report) {
            return NextResponse.json(
                { error: 'Channel ID, timeframe, and report are required' },
                { status: 400 }
            );
        }

        await redisClient.cacheReport(channelId, timeframe, report);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error caching report:', error);
        return NextResponse.json(
            { error: 'Failed to cache report' },
            { status: 500 }
        );
    }
}
