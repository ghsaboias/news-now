import { AnthropicClient } from '@/services/claude/client';
import { DiscordClient } from '@/services/discord/client';
import { ReportGenerator } from '@/services/report/generator';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const channelId = searchParams.get('channelId');
    const channelName = searchParams.get('channelName');

    if (!channelId || !channelName) {
      return NextResponse.json(
        { error: 'Channel ID and name are required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const discordClient = new DiscordClient();
    const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
    const reportGenerator = new ReportGenerator(claudeClient);

    // Fetch messages
    const messages = await discordClient.fetchMessagesInTimeframe(channelId, 24);

    // Generate summary
    const summary = await reportGenerator.createAISummary(
      messages,
      channelName,
      24
    );

    if (!summary) {
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error in /api/discord/summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
} 