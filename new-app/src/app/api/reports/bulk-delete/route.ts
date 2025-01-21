import { ReportStorage } from '@/services/report/storage';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
    try {
        const { date } = await request.json();
        if (!date) {
            return NextResponse.json(
                { error: 'Date is required' },
                { status: 400 }
            );
        }
        await ReportStorage.deleteReportsByDate(date);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting reports:', error);
        return NextResponse.json(
            { error: 'Failed to delete reports' },
            { status: 500 }
        );
    }
} 