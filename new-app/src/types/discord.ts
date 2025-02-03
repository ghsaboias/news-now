export interface MessageAuthor {
    username: string;
    discriminator: string;
}

export interface MessageEmbedField {
    name: string;
    value: string;
}

export interface MessageEmbed {
    type: string;
    url?: string;
    title?: string;
    description?: string;
    timestamp?: string;
    fields?: Array<{
        name: string;
        value: string;
        inline: boolean;
    }>;
    author?: {
        name: string;
        icon_url?: string;
        proxy_icon_url?: string;
    };
    footer?: {
        text: string;
    };
    thumbnail?: {
        url: string;
        proxy_url?: string;
        width?: number;
        height?: number;
        flags?: number;
    };
    content_scan_version?: number;
}

export interface DiscordMessage {
    type: number;
    content: string;
    mentions: any[];
    mention_roles: any[];
    attachments: Array<{
        id: string;
        filename: string;
        size: number;
        url: string;
        proxy_url?: string;
        width?: number;
        height?: number;
        content_type?: string;
        content_scan_version?: number;
        placeholder?: string;
        placeholder_version?: number;
    }>;
    embeds: MessageEmbed[];
    timestamp: string;
    edited_timestamp: string | null;
    flags: number;
    components: any[];
    id: string;
    channel_id: string;
    author: {
        id: string;
        username: string;
        avatar?: string;
        discriminator: string;
        public_flags: number;
        flags: number;
        bot?: boolean;
        banner?: string | null;
        accent_color?: number | null;
        global_name?: string | null;
        avatar_decoration_data?: any | null;
        banner_color?: string | null;
        clan?: any | null;
        primary_guild?: any | null;
    };
    pinned: boolean;
    mention_everyone: boolean;
    tts: boolean;
    message_reference?: {
        type: number;
        channel_id: string;
        message_id: string;
        guild_id?: string;
    };
    position?: number;
    referenced_message?: DiscordMessage;
    status?: 'processing' | 'success' | 'error';
    platform?: string;
    handle?: string;
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
    platform?: 'telegram' | 'x';
    handle?: string;
    success: boolean;
    error?: string;
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