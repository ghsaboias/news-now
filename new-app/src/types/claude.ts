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
