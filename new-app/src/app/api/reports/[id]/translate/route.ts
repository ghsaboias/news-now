import { AnthropicClient } from '@/services/claude/client';
import { ReportService } from '@/services/redis/reports';
import { TranslationService } from '@/services/translation/translator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // Extract report ID from URL
        const id = request.url.split('/').slice(-2)[0];
        const { language } = await request.json();

        if (!id || !language) {
            return NextResponse.json(
                { error: 'Report ID and target language are required' },
                { status: 400 }
            );
        }

        // Validate language code
        const validLanguages = ['es', 'fr', 'ar', 'pt', 'ru', 'zh', 'hi'];
        if (!validLanguages.includes(language)) {
            return NextResponse.json(
                { error: 'Unsupported target language' },
                { status: 400 }
            );
        }

        // Get the report
        const report = await ReportService.getReport(id);
        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        // Check if translation already exists
        if (report.summary.translations?.some(t => t.language === language)) {
            return NextResponse.json(
                { error: 'Translation already exists for this language' },
                { status: 400 }
            );
        }

        // Initialize services
        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: 'ANTHROPIC_API_KEY is not configured' },
                { status: 500 }
            );
        }

        const claudeClient = new AnthropicClient(process.env.ANTHROPIC_API_KEY);
        const translationService = new TranslationService(claudeClient);

        // Generate translation
        const translation = await translationService.translateSummary(
            report.summary,
            language
        );

        if (!translation) {
            return NextResponse.json(
                { error: 'Failed to generate translation' },
                { status: 500 }
            );
        }

        // Update report with new translation
        report.summary.translations = [
            ...(report.summary.translations || []),
            translation
        ];

        // Save updated report
        await ReportService.updateReport(report);

        return NextResponse.json({
            success: true,
            data: translation
        });
    } catch (error) {
        console.error('Error translating report:', error);
        return NextResponse.json(
            { error: 'Failed to translate report' },
            { status: 500 }
        );
    }
}