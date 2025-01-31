import { Translation } from "@/types/translation";

export interface AISummary {
    headline: string;
    location: string;
    body: string;
    sources: string[];
    raw_response: string;
    timestamp: string;
    period_start?: string;
    period_end?: string;
    translations?: Translation[];
}

export interface Timeframe {
    type: '1h' | '4h' | '24h';
    start: string;
    end: string;
}

export interface Report {
    id: string;
    channelId: string;
    channelName: string;
    timestamp: string;
    timeframe: Timeframe;
    messageCount: number;
    summary: AISummary;
}

export interface ReportGroup {
    date: string;
    reports: Report[];
}

export interface ReportResponse {
    report: {
        summary: {
            headline: string;
            location: string;
            body: string;
            raw_response: string;
        };
        message_count: number;
        period_start: Date;
        period_end: Date;
    };
}
