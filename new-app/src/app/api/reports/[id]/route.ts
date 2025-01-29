import { ReportService } from '@/services/redis/reports';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: {
        id: string;
    };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const report = await ReportService.getReport(params.id);
        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }
        return NextResponse.json(report);
    } catch (error) {
        console.error('Failed to fetch report:', error);
        return NextResponse.json(
            { error: 'Failed to fetch report' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const report = await request.json();
        await ReportService.updateReport(report);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update report:', error);
        return NextResponse.json(
            { error: 'Failed to update report' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await ReportService.deleteReport(params.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete report:', error);
        return NextResponse.json(
            { error: 'Failed to delete report' },
            { status: 500 }
        );
    }
} 