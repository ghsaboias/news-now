export const KEYS = {
    REPORT: {
        SINGLE: (id: string) => `report:${id}`,
        ALL: 'reports:all',
        BY_DATE: (date: string) => `reports:date:${date}`,
        BY_CHANNEL: (channelId: string) => `reports:channel:${channelId}`,
    },
    CHANNEL: {
        STATUS: (id: string) => `channel:${id}:status`,
        PROGRESS: (id: string) => `channel:${id}:progress`,
    },
    GENERATION: {
        STATUS: (id: string) => `generation:${id}:status`,
        PROGRESS: (id: string) => `generation:${id}:progress`,
    }
} as const;

export const TTL = {
    REPORT: 3600,          // 1 hour
    CHANNEL_STATUS: 300,   // 5 minutes
    GENERATION: 300,       // 5 minutes
    PROGRESS: 60          // 1 minute
} as const; 