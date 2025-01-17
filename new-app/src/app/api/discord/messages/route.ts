import { DiscordClient } from '@/services/discord/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    const client = new DiscordClient();
    const messages = await client.fetchMessagesInTimeframe(channelId, 24);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error in /api/discord/messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
} 