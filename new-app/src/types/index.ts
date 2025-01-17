// Discord Types
export interface DiscordChannel {
    id: string;
    name: string;
    type: number;
    position?: number;
    parent_id?: string;
}

export interface DiscordMessage {
    id: string;
    content: string;
    timestamp: string;
    author?: {
        username: string;
        discriminator: string;
    };
    embeds: DiscordEmbed[];
}

// Report Types
export interface Summary {
    headline: string;
    location: string;
    body: string;
    raw_response: string;
}

export interface ReportResult {
    summary: Summary;
    message_count: number;
    period_start: Date;
    period_end: Date;
}

export interface StoredSummary {
    period_start: string;
    period_end: string;
    timeframe: string;
    channel: string;
    content: Summary;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface ChannelListResponse {
    channels: DiscordChannel[];
}

export interface ReportResponse {
    report: ReportResult;
}

export interface DiscordEmbed {
    title?: string;
    description?: string;
    fields?: Array<{
        name: string;
        value: string;
    }>;
}

export interface FormattedMessage {
    timestamp: string;
    content: string;
    embeds: DiscordEmbed[];
    author: {
        username: string;
        discriminator: string;
    };
}

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
    timestamp: string;
    author?: DiscordAuthor;
    embeds: DiscordEmbed[];
}

export interface DiscordChannel {
    id: string;
    type: number;
    name: string;
    position?: number;
    parent_id?: string;
}

export interface FormattedMessageOutput {
    timestamp: string;
    content: string;
    embedInfo: {
        titles: string[];
        descriptions: string[];
        fields: Array<{
            name: string;
            value: string;
        }>;
    };
}

interface AISummaryResponse {
    headline: string;
    location_and_period: string;
    timestamp: string;
    body: string;
}

export interface AISummary extends AISummaryResponse {
    headline: string;
    location_and_period: string;
    body: string;
    raw_response?: string;
    period_start?: string;
    period_end?: string;
}

export interface ClaudeMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ClaudeResponse {
    content: Array<{ text: string }>;
}

export interface ClaudeClient {
    messages: {
        create: (params: {
            model: string;
            max_tokens: number;
            system?: string;
            messages: ClaudeMessage[];
        }) => Promise<ClaudeResponse>;
    };
} 
