import { Report } from '@/types';

// Validation error types
export class ReportValidationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'ReportValidationError';
    }
}

// Validation types
export interface TimeframeValidation {
    type: '1h' | '4h' | '24h';
    start: Date;
    end: Date;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// Validation functions
export class ReportValidator {
    static validateReport(report: Report): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Required fields
        if (!report.id) {
            errors.push('Report ID is required');
        }
        if (!report.channelId) {
            errors.push('Channel ID is required');
        }
        if (!report.timestamp) {
            errors.push('Timestamp is required');
        }

        // Timeframe validation
        if (!report.timeframe) {
            errors.push('Timeframe is required');
        } else {
            try {
                this.validateTimeframe(report.timeframe);
            } catch (error) {
                if (error instanceof ReportValidationError) {
                    errors.push(error.message);
                }
            }
        }

        // Message count validation
        if (report.messageCount === undefined || report.messageCount < 0) {
            errors.push('Invalid message count');
        }

        // Summary validation
        if (!report.summary) {
            errors.push('Summary is required');
        } else {
            if (!report.summary.headline) {
                errors.push('Summary headline is required');
            }
            if (!report.summary.body) {
                errors.push('Summary body is required');
            }
            if (!report.summary.sources || report.summary.sources.length === 0) {
                warnings.push('Summary has no sources');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    static validateTimeframe(timeframe: { type: string; start: string; end: string }): TimeframeValidation {
        // Validate type
        if (!['1h', '4h', '24h'].includes(timeframe.type)) {
            throw new ReportValidationError('Invalid timeframe type', 'INVALID_TIMEFRAME_TYPE');
        }

        // Validate dates
        const start = new Date(timeframe.start);
        const end = new Date(timeframe.end);

        if (isNaN(start.getTime())) {
            throw new ReportValidationError('Invalid start date', 'INVALID_START_DATE');
        }
        if (isNaN(end.getTime())) {
            throw new ReportValidationError('Invalid end date', 'INVALID_END_DATE');
        }
        if (end.getTime() <= start.getTime()) {
            throw new ReportValidationError('End date must be after start date', 'INVALID_DATE_ORDER');
        }

        // Validate duration
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const expectedDuration = parseInt(timeframe.type);
        if (Math.abs(duration - expectedDuration) > 0.1) { // Allow 6 minutes tolerance
            throw new ReportValidationError(
                `Duration mismatch: expected ${expectedDuration}h, got ${duration.toFixed(1)}h`,
                'DURATION_MISMATCH'
            );
        }

        return {
            type: timeframe.type as '1h' | '4h' | '24h',
            start,
            end
        };
    }

    static validateTimeframeOverlap(timeframes: TimeframeValidation[]): string[] {
        const warnings: string[] = [];

        for (let i = 0; i < timeframes.length; i++) {
            for (let j = i + 1; j < timeframes.length; j++) {
                const a = timeframes[i];
                const b = timeframes[j];

                if (a.start <= b.end && b.start <= a.end) {
                    warnings.push(`Timeframe overlap detected between ${a.type} and ${b.type}`);
                }
            }
        }

        return warnings;
    }

    static validateTimeframeCoverage(timeframes: TimeframeValidation[]): string[] {
        const warnings: string[] = [];

        // Sort timeframes by start time
        const sorted = [...timeframes].sort((a, b) => a.start.getTime() - b.start.getTime());

        // Check for gaps
        for (let i = 1; i < sorted.length; i++) {
            const current = sorted[i];
            const previous = sorted[i - 1];

            const gap = (current.start.getTime() - previous.end.getTime()) / (1000 * 60 * 60);
            if (gap > 1) { // Gap larger than 1 hour
                warnings.push(`Coverage gap of ${gap.toFixed(1)}h detected between ${previous.type} and ${current.type}`);
            }
        }

        return warnings;
    }
} 