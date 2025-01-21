import { ReportStorage } from '@/services/report/storage';
import { Report, ReportGroup } from '@/types';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const reports = await ReportStorage.getAllReports();

        // Validate the reports structure before sending
        if (!Array.isArray(reports)) {
            console.error('Storage returned invalid data:', reports);
            throw new Error('Invalid data structure from storage');
        }

        // Basic validation of report groups
        const validReports = reports.every((group): group is ReportGroup => {
            return (
                group &&
                typeof group === 'object' &&
                'date' in group &&
                'reports' in group &&
                Array.isArray(group.reports) &&
                group.reports.every((report): report is Report => {
                    return (
                        report &&
                        typeof report === 'object' &&
                        'id' in report &&
                        'channelId' in report &&
                        'channelName' in report &&
                        'timestamp' in report &&
                        'timeframe' in report &&
                        'messageCount' in report &&
                        'summary' in report
                    );
                })
            );
        });

        if (!validReports) {
            console.error('Storage returned malformed report data');
            throw new Error('Invalid report data structure');
        }

        return NextResponse.json(reports);
    } catch (error) {
        console.error('Error fetching reports:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const report = await request.json();

        // Validate the report structure
        if (
            !report ||
            typeof report !== 'object' ||
            !('id' in report) ||
            !('channelId' in report) ||
            !('channelName' in report) ||
            !('timestamp' in report) ||
            !('timeframe' in report) ||
            !('messageCount' in report) ||
            !('summary' in report)
        ) {
            return NextResponse.json(
                { error: 'Invalid report data structure' },
                { status: 400 }
            );
        }

        await ReportStorage.saveReport(report as Report);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving report:', error);
        return NextResponse.json(
            { error: 'Failed to save report' },
            { status: 500 }
        );
    }
} 