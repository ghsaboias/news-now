import { ReportStorage } from '@/services/report/storage';
import { Report } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const report: Report = await request.json();
        if (report.id !== params.id) {
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
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await ReportStorage.deleteReport(params.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting report:', error);
        return NextResponse.json(
            { error: 'Failed to delete report' },
            { status: 500 }
        );
    }
} 