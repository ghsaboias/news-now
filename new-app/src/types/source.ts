import { DiscordMessage } from '@/types';

export interface ExtractedSource {
    id: string;
    platform: 'telegram' | 'x';
    handle: string;
    timestamp: string;
}

export interface SourceExtractorMessage extends DiscordMessage {
    embeds: Array<{
        title?: string;
        description?: string;
        fields?: Array<{
            name: string;
            value: string;
        }>;
    }>;
} 