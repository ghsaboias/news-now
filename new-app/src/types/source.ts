export interface ExtractedSource {
    id: string;
    platform: 'telegram' | 'x';
    handle: string;
    timestamp: string;
}

export interface Source {
    id: string;
    platform: 'telegram' | 'x';
    handle: string;
    first_seen_at: string;
    last_seen_at: string;
}

export interface SourceBlock {
    platform: string;
    handle: string;
    references: {
        time: string;
        quote: string;
        url: string;
        timestamp: string;
        author: {
            username: string;
            avatar?: string;
            globalName?: string;
        };
        attachments?: {
            type: 'image' | 'video';
            url: string;
            width: number;
            height: number;
            filename: string;
        }[];
        embed?: {
            description?: string;
            title?: string;
            translatedFrom?: string;
            thumbnail?: {
                url: string;
                width: number;
                height: number;
            };
        };
        referencedMessage?: {
            content: string;
            author: {
                username: string;
                globalName?: string;
            };
        };
        status: 'success' | 'error' | 'processing';
    }[];
}