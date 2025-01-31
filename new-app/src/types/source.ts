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