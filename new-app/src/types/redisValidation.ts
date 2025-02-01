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