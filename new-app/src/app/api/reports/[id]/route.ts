import { ReportStorage } from '@/services/report/storage';
import { Report } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
    request: NextRequest
) {
    try {
        const id = request.url.split('/').pop();
        const report: Report = await request.json();
        if (report.id !== id) {
            return NextResponse.json(
                { error: 'Report ID mismatch' },
                { status: 400 }
            );
        }
        await ReportStorage.updateReport(report);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating report:', error);
        return NextResponse.json(
            { error: 'Failed to update report' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest
) {
    try {
        const id = request.url.split('/').pop();
        if (!id) {
            return NextResponse.json(
                { error: 'Report ID is required' },
                { status: 400 }
            );
        }
        await ReportStorage.deleteReport(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting report:', error);
        return NextResponse.json(
            { error: 'Failed to delete report' },
            { status: 500 }
        );
    }
} 