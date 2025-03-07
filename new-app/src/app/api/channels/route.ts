import { DiscordChannel } from '@/types';
import { config } from '@/utils/config';
import axios from 'axios';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await axios.get(`https://discord.com/api/v10/guilds/${config.GUILD_ID}/channels`, {
            headers: {
                Authorization: `${config.DISCORD_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        // Filter channels as before
        const allowedEmojis = new Set(['🔵', '🟡', '🔴', '🟠', '⚫']);
        const filteredChannels = response.data.filter((channel: DiscordChannel) => {
            if (channel.type !== 0) return false;
            if (channel.parent_id === '1112044935982633060') return true;
            if (!channel.name || channel.name.includes('godly-chat')) return false;
            if ((channel.position || 0) >= 30) return false;

            const firstChar = Array.from(channel.name)[0] || '';
            return allowedEmojis.has(firstChar);
        });

        return NextResponse.json(filteredChannels);
    } catch (error: any) {
        console.error('Error fetching Discord channels:', error.message);
        return NextResponse.json(
            { error: 'Failed to fetch Discord channels' },
            { status: 500 }
        );
    }
} 