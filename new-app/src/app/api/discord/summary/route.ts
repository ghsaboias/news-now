import { AnthropicClient } from '@/services/claude/client';
import { MessageValidationError, MessageValidator } from '@/services/discord/validation';
import { ReportGenerator } from '@/services/report/generator';
import { TimeframeType } from '@/types/reportContext';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const channelId = searchParams.get('channelId');
        const channelName = searchParams.get('channelName');
        const timeframe = searchParams.get('timeframe') as TimeframeType;

        if (!channelName) {
            return NextResponse.json(
                { error: 'Channel name is required' },
                { status: 400 }
            );
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: 'ANTHROPIC_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const { messages, previousSummary } = await request.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required in request body' },
                { status: 400 }
            );
        }

        // Validate transformed messages within timeframe
        const timeframeWindow = MessageValidator.getTimeframeWindow(timeframe);
        const messageValidation = MessageValidator.validateMessages(messages, timeframeWindow);

        if (!messageValidation.isValid || messageValidation.validMessages.length === 0) {
            return NextResponse.json(
                {
                    error: 'Invalid messages',
                    details: messageValidation.errors,
                    warnings: messageValidation.warnings
                },
                { status: 400 }
            );
        }

        const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
        const reportGenerator = new ReportGenerator(claudeClient);

        const summary = await reportGenerator.createAISummary(
            messages,
            channelName,
            timeframe === '24h' ? 24 : timeframe === '4h' ? 4 : 1,
            previousSummary
        );

        if (!summary) {
            return NextResponse.json(
                { error: 'Failed to generate summary' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ...summary,
            warnings: messageValidation.warnings
        });
    } catch (error) {
        console.error('Error in /api/discord/summary:', error);
        if (error instanceof MessageValidationError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to generate summary' },
            { status: 500 }
        );
    }
} 