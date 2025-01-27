// Discord Types
export interface DiscordAuthor {
    username: string;
    discriminator: string;
}

export interface DiscordEmbedField {
    name: string;
    value: string;
}

export interface DiscordEmbed {
    title?: string;
    description?: string;
    fields?: DiscordEmbedField[];
}

export interface DiscordMessage {
    id: string;
    content: string;
    author: DiscordAuthor;
    timestamp: string;
    embeds?: DiscordEmbed[];
}

export interface DiscordChannel {
    id: string;
    name: string;
    type: number;
    position?: number;
    parent_id?: string;
}

// Report Types
export interface AISummary {
    headline: string;
    location: string;
    body: string;
    sources: string[];
    raw_response: string;
    timestamp: string;
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
}

export interface ReportGroup {
    date: string;
    reports: Report[];
}

// Source Types
export interface ExtractedSource {
    id: string;
    platform: 'telegram' | 'x';
    handle: string;
    timestamp: string;
}

export interface StoredMessage {
    id: string;
    topic_id: string;
    source_id: string;
    discord_message_id: string;
    content: string;
    embed_title?: string;
    embed_description?: string;
    embed_fields?: {
        name: string;
        value: string;
    }[];
    timestamp: string;
}

export interface MessageProcessingResult {
    messageId: string;
    sourceId?: string;
    embedCount: number;
    success: boolean;
    error?: string;
}

// Message Processing Types
export type MessageProcessingStatus = 'pending' | 'processing' | 'success' | 'error';

export interface ProcessedMessage {
    id: string;
    content: string;
    hasEmbeds: boolean;
    embedCount: number;
    sourceInfo?: ExtractedSource;
    status: MessageProcessingStatus;
}

// Claude AI Types
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

// Activity Types
export interface ActivityThreshold {
    timeframe: '1h' | '4h' | '24h';
    minMessages: number;
}

export interface ChannelActivity {
    channelId: string;
    channelName: string;
    status: 'pending' | 'processing' | 'success' | 'skipped' | 'error';
    messageCount?: number;
    error?: string;
}

export interface BulkGenerationProgress {
    thresholds: ActivityThreshold[];
    channels: ChannelActivity[];
    status: 'scanning' | 'generating' | 'complete' | 'error';
    currentChannel?: string;
}

// API Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface ChannelListResponse {
    channels: DiscordChannel[];
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

export interface SourceExtractorMessage {
    id: string;
    content: string;
    timestamp: string;
    author: DiscordAuthor;
    embeds: DiscordEmbed[];
}

export interface ChannelInfo {
    id: string;
    name: string;
}