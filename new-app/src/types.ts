export interface AISummary {
    headline: string;
    location_and_period: string;
    body: string;
    sources: string[];
    raw_response: string;
    timestamp: string;
    period_start?: string;
    period_end?: string;
}

export interface DiscordMessage {
    id: string;
    content: string;
    author: {
        username: string;
        discriminator: string;
    };
    timestamp: string;
}

export interface DiscordChannel {
    id: string;
    name: string;
    type: number;
    position?: number;
    parent_id?: string;
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

export interface ClaudeMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ClaudeResponse {
    content: { text: string }[];
}

export interface ClaudeClient {
    messages: {
        create: (options: {
            model: string;
            max_tokens: number;
            system: string;
            messages: ClaudeMessage[];
        }) => Promise<ClaudeResponse>;
    };
}

export interface ActivityThreshold {
    timeframe: '1h' | '4h' | '24h';
    minMessages: number;
}

export interface ChannelActivity {
    channelId: string;
    channelName: string;
    messageCount?: number;
    status: 'pending' | 'processing' | 'success' | 'skipped' | 'error';
}

export interface BulkGenerationProgress {
    thresholds: ActivityThreshold[];
    channels: ChannelActivity[];
    status: 'scanning' | 'generating' | 'complete' | 'error';
    currentChannel?: string;
}
