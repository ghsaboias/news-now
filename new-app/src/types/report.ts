import { ChannelInfo } from "@/types/discord";
import { DiscordMessage } from './discord';

export interface AISummary {
    headline: string;
    location: string;
    body: string;
    raw_response: string;
    timestamp: string;
    warnings?: string[];
    translations?: Array<{
        language: string;
        headline: string;
        location: string;
        body: string;
        timestamp: string;
    }>;
    period_start?: string;
    period_end?: string;
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
    messages: DiscordMessage[];
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

// Report Validation Types migrated from report/validation.ts
export interface BulkGenerationParams {
    timeframe: '1h' | '4h' | '24h';
    minMessages: number;
    batchSize?: number;
}

export interface BulkValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validChannels: ChannelInfo[];
    skippedChannels: Array<{
        channel: ChannelInfo;
        reason: string;
    }>;
}

// Report Queue Types
export interface QueuedChannel {
    channel: ChannelInfo;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
    error?: string;
    report?: Report;
}

export interface ReportContent {
    headline: string;
    location: string;
    body: string;
    raw_response?: string;
}


