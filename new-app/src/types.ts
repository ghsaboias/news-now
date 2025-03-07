// Discord Types
export interface DiscordMessage {
    id: string;
    content: string;
    timestamp: string;
    author: {
        username: string;
        discriminator: string;
    };
    embeds?: { title?: string; description?: string; fields?: { name: string; value: string }[] }[];
}

// Report Types
export interface AISummary {
    headline: string;
    location: string;
    body: string;
    raw_response: string;
    timestamp: string;
    period_start: string;
    period_end: string;
}

export interface Report {
    id: string;
    channelId: string;
    channelName: string;
    timestamp: string;
    timeframe: { type: '1h' | '4h' | '24h'; start: string; end: string };
    messageCount: number;
    summary: AISummary;
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

export interface DiscordChannel {
    id: string;
    name: string;
    type: number;
    position: number;
    parent_id: string;
}