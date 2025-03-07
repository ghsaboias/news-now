import { DiscordClient } from '@/services/discord/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const channelName = searchParams.get('channelName');
    const timeframe = searchParams.get('timeframe') || '24h';

    if (!channelId || !channelName) {
        return NextResponse.json(
            { error: `${!channelId ? 'Channel ID' : 'Channel name'} is required` },
            { status: 400 }
        );
    }

    const hours = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 24;

    try {
        const client = new DiscordClient();
        const messages = await client.fetchMessagesInTimeframe(channelId, hours);
        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}