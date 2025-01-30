import { ReportService } from '@/services/redis/reports';
import { ReportValidationError } from '@/services/redis/validation';
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
                { error: 'Report not found', code: 'REPORT_NOT_FOUND' },
                { status: 404 }
            );
        }
        return NextResponse.json(report);
    } catch (error) {
        console.error('Failed to fetch report:', error);
        if (error instanceof ReportValidationError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to fetch report' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const report = await request.json();
        if (report.id !== params.id) {
            return NextResponse.json(
                { error: 'Report ID mismatch', code: 'ID_MISMATCH' },
                { status: 400 }
            );
        }
        const validation = await ReportService.updateReport(report);
        return NextResponse.json({
            success: true,
            warnings: validation.warnings
        });
    } catch (error) {
        console.error('Failed to update report:', error);
        if (error instanceof ReportValidationError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 400 }
            );
        }
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
        if (error instanceof ReportValidationError) {
            if (error.code === 'REPORT_NOT_FOUND') {
                return NextResponse.json(
                    { error: error.message, code: error.code },
                    { status: 404 }
                );
            }
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to delete report' },
            { status: 500 }
        );
    }
} 