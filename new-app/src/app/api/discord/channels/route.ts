import { DiscordClient } from '@/services/discord/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const client = new DiscordClient();
    const channels = await client.fetchChannels();
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error in /api/discord/channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
} 