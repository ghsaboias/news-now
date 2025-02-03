export interface Topic {
    id: string;
    name: string;
    created_at?: string;
}

export interface Source {
    id: string;
    platform: 'telegram' | 'x';
    handle: string;
    first_seen_at: string;
    last_seen_at: string;
}

export interface Message {
    id: string;
    topic_id: string;
    content: string;
    platform?: 'telegram' | 'x';
    handle?: string;
    embed_title?: string;
    embed_description?: string;
    timestamp: string;
}

export interface MessageField {
    message_id: string;
    name: string;
    value: string;
}