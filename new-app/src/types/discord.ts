import { ExtractedSource } from '@/types/source';

export interface MessageAuthor {
    username: string;
    discriminator: string;
}

export interface MessageEmbedField {
    name: string;
    value: string;
}

export interface MessageEmbed {
    title?: string;
    description?: string;
    fields?: MessageEmbedField[];
}

export interface DiscordMessage {
    id: string;
    content: string;
    author: MessageAuthor;
    timestamp: string;
    embeds?: MessageEmbed[];
}

export interface DiscordChannel {
    id: string;
    name: string;
    type: number;
    position?: number;
    parent_id?: string;
    archived?: boolean;
    status?: 'active' | 'archived' | 'disabled';
}

export type MessageProcessingStatus = 'pending' | 'processing' | 'success' | 'error';

export interface MessageProcessingResult {
    messageId: string;
    sourceId?: string;
    embedCount: number;
    success: boolean;
    error?: string;
}

export interface ProcessedMessage {
    id: string;
    content: string;
    hasEmbeds: boolean;
    embedCount: number;
    sourceInfo?: ExtractedSource;
    status: MessageProcessingStatus;
}

export interface ChannelListResponse {
    channels: DiscordChannel[];
}

export interface ChannelInfo {
    id: string;
    name: string;
}

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

export interface Topic {
    id: string;
    name: string;
    created_at: string;
}
