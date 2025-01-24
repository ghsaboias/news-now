import { DiscordClient } from '@/services/discord/client';
import { DiscordChannel } from '@/types';
import { NextResponse } from 'next/server';

// Cache channels in memory with a 5-minute TTL
let channelsCache: {
  data: DiscordChannel[];
  timestamp: number;
} | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Check cache
    if (channelsCache && (Date.now() - channelsCache.timestamp) < CACHE_TTL) {
      return NextResponse.json(channelsCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
        }
      });
    }

    if (!process.env.DISCORD_TOKEN) {
      return NextResponse.json(
        { error: 'DISCORD_TOKEN is not configured' },
        { status: 500 }
      );
    }

    const client = new DiscordClient();
    const channels = await client.fetchChannels();

    // Update cache
    channelsCache = {
      data: channels,
      timestamp: Date.now()
    };

    return NextResponse.json(channels, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60'
      }
    });
  } catch (error) {
    console.error('Error in /api/discord/channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
} 