import { AnthropicClient } from '@/services/claude/client';
import { ReportGenerator } from '@/services/report/generator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

        const { messages, previousSummary, timeframe = '1h' } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required in request body' },
                { status: 400 }
            );
        }

        const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
        const reportGenerator = new ReportGenerator(claudeClient);

        const requestedHours = timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1;
        const actualTimeframeHours = messages.length > 0 ?
            Math.ceil((new Date(messages[messages.length - 1].timestamp).getTime() -
                new Date(messages[0].timestamp).getTime()) / (1000 * 60 * 60)) : 1;

        console.log(`[Summary Generator] Timeframe analysis:`, {
            requestedTimeframe: `${requestedHours}h`,
            actualTimeframeHours,
            firstMessage: messages[0]?.timestamp,
            lastMessage: messages[messages.length - 1]?.timestamp,
            messageCount: messages.length
        });

        const summary = await reportGenerator.createAISummary(
            messages,
            channelName,
            requestedHours,
            previousSummary
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