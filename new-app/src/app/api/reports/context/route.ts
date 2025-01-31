export const dynamic = 'force-dynamic';

import { ReportService } from '@/services/redis/reports';
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

        const reports = await ReportService.getReportsByChannel(channelId, timeframe);
        const sortedReports = reports.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return NextResponse.json({
            primary: sortedReports[0] || null,
            related: sortedReports.slice(1)
        });
    } catch (error) {
        console.error('Failed to fetch report context:', error);
        return NextResponse.json(
            { error: 'Failed to fetch report context' },
            { status: 500 }
        );
    }
} 