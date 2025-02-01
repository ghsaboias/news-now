export interface MessageCounts {
    [channelId: string]: {
        [period: string]: number;
    };
}

export interface LoadingState {
    [channelId: string]: Set<string>;
}

export interface MessageResult {
    channelId: string;
    period: string;
    count: number;
}

export interface UpdateData {
    type: 'update';
    results: MessageResult[];
} 