import { ClaudeClient, ClaudeMessage, ClaudeResponse } from '@/types';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicClient implements ClaudeClient {
    private client: Anthropic;

    constructor(apiKey: string) {
        this.client = new Anthropic({
            apiKey,
        });
    }

    messages = {
        create: async (params: {
            model: string;
            max_tokens: number;
            system?: string;
            messages: ClaudeMessage[];
        }): Promise<ClaudeResponse> => {
            const response = await this.client.messages.create({
                model: params.model,
                max_tokens: params.max_tokens,
                system: params.system,
                messages: params.messages.map(msg => ({
                    role: msg.role === 'system' ? 'assistant' : msg.role,
                    content: msg.content,
                })),
            });

            // Handle the response content safely
            const text = response.content[0].type === 'text'
                ? response.content[0].text
                : '';

            return {
                content: [{ text }],
            };
        },
    };
} 