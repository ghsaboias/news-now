// Base Validation Error
export class ValidationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

// Shared interfaces
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface TimeframeWindow {
    start: Date;
    end: Date;
}

export type TimeframeType = '1h' | '4h' | '24h';

// Shared constants
export const TIMEFRAME_HOURS = {
    '1h': 1,
    '4h': 4,
    '24h': 24
} as const;

// Base validation utilities
export class BaseValidator {
    public static isValidTimestamp(timestamp: string): boolean {
        const date = new Date(timestamp);
        return !isNaN(date.getTime());
    }

    protected static validateTimeframe(timeframe: { type: string; start: string; end: string }): TimeframeWindow {
        // Validate type
        if (!Object.keys(TIMEFRAME_HOURS).includes(timeframe.type)) {
            throw new ValidationError('Invalid timeframe type', 'INVALID_TIMEFRAME_TYPE');
        }

        // Validate dates
        const start = new Date(timeframe.start);
        const end = new Date(timeframe.end);

        if (isNaN(start.getTime())) {
            throw new ValidationError('Invalid start date', 'INVALID_START_DATE');
        }
        if (isNaN(end.getTime())) {
            throw new ValidationError('Invalid end date', 'INVALID_END_DATE');
        }
        if (end.getTime() < start.getTime()) {
            throw new ValidationError('End date must be after start date', 'INVALID_DATE_ORDER');
        }

        // Validate duration
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (duration > TIMEFRAME_HOURS[timeframe.type as TimeframeType]) {
            throw new ValidationError('Duration is greater than timeframe', 'DURATION_GREATER_THAN_TIMEFRAME');
        }

        return { start, end };
    }
} 