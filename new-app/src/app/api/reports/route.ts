import { ReportService } from '@/services/redis/reports';
import { ReportValidationError } from '@/services/redis/validation';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/reports - Get all reports
export async function GET() {
    try {
        const reports = await ReportService.getAllReports();
        return NextResponse.json(reports);
    } catch (error) {
        console.error('Failed to fetch reports:', error);
        if (error instanceof ReportValidationError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to fetch reports' },
            { status: 500 }
        );
    }
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
    try {
        const report = await request.json();
        const validation = await ReportService.addReport(report);

        // Return success with any warnings
        return NextResponse.json({
            success: true,
            warnings: validation.warnings
        });
    } catch (error) {
        console.error('Failed to create report:', error);
        if (error instanceof ReportValidationError) {
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to create report' },
            { status: 500 }
        );
    }
}

// PUT /api/reports/:id - Update a report
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const report = await request.json();
        const validation = await ReportService.updateReport(report);

        // Return success with any warnings
        return NextResponse.json({
            success: true,
            warnings: validation.warnings
        });
    } catch (error) {
        console.error('Error updating report:', error);
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

// DELETE /api/reports/:id - Delete a report
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await ReportService.deleteReport(params.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting report:', error);
        return NextResponse.json(
            { error: 'Failed to delete report' },
            { status: 500 }
        );
    }
} 