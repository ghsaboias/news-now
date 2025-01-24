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

        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];

        const actualTimeframeHours = messages.length > 0 && firstMessage?.timestamp && lastMessage?.timestamp ?
            Math.ceil((new Date(lastMessage.timestamp).getTime() -
                new Date(firstMessage.timestamp).getTime()) / (1000 * 60 * 60)) : requestedHours;

        console.log(`[Summary Generator] Timeframe analysis:`, {
            requestedTimeframe: `${requestedHours}h`,
            actualTimeframeHours,
            firstMessage: firstMessage?.timestamp || null,
            lastMessage: lastMessage?.timestamp || null,
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