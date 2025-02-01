import { Report } from '@/types/report';

export interface TimeWindow {
    start: Date;
    end: Date;
}

export interface ReportContext {
    primary: Report | null;
    supporting: Report[];
    coverage: TimeWindow[];
    validationWarnings?: string[];
}

export interface TimeframeRule {
    type: '1h' | '4h' | '24h';
    maxAge: number;
    outsideCurrentWindow?: boolean;
}

export interface TimeframeRules {
    primary: TimeframeRule;
    supporting: TimeframeRule[];
}

export type TimeframeType = '1h' | '4h' | '24h';

export type ChannelReports = Record<TimeframeType, Report[]>;

