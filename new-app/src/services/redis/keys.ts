import { Timeframe } from '@/types/report';

// Key namespace types for type safety
type KeyNamespace = 'report' | 'channel' | 'generation' | 'cache';
type KeyType = 'status' | 'progress' | 'data' | 'index';

// Key structure utilities
const createNamespacedKey = (
    namespace: KeyNamespace,
    type: KeyType,
    ...parts: string[]
) => {
    const key = [namespace, ...parts, type].join(':');
    return `newsnow:${key}`;
};

const validateTimeframe = (timeframe: string): timeframe is Timeframe['type'] => {
    return ['1h', '4h', '24h'].includes(timeframe);
};

const validateChannelId = (channelId: string): boolean => {
    return /^\d+$/.test(channelId);
};

export const KEYS = {
    REPORT: {
        SINGLE: (id: string) => createNamespacedKey('report', 'data', id),
        ALL: createNamespacedKey('report', 'index', 'all'),
        BY_DATE: (date: string) => createNamespacedKey('report', 'index', 'date', date),
        BY_CHANNEL: (channelId: string) => {
            if (!validateChannelId(channelId)) {
                throw new Error(`Invalid channel ID: ${channelId}`);
            }
            return createNamespacedKey('report', 'index', 'channel', channelId);
        },
        BY_TIMEFRAME: (channelId: string, timeframe: string) => {
            if (!validateChannelId(channelId)) {
                throw new Error(`Invalid channel ID: ${channelId}`);
            }
            if (!validateTimeframe(timeframe)) {
                throw new Error(`Invalid timeframe: ${timeframe}`);
            }
            return createNamespacedKey('report', 'data', 'channel', channelId, timeframe);
        }
    },
    CHANNEL: {
        STATUS: (id: string) => {
            if (!validateChannelId(id)) {
                throw new Error(`Invalid channel ID: ${id}`);
            }
            return createNamespacedKey('channel', 'status', id);
        },
        PROGRESS: (id: string) => {
            if (!validateChannelId(id)) {
                throw new Error(`Invalid channel ID: ${id}`);
            }
            return createNamespacedKey('channel', 'progress', id);
        }
    },
    GENERATION: {
        STATUS: (id: string) => {
            if (!validateChannelId(id)) {
                throw new Error(`Invalid channel ID: ${id}`);
            }
            return createNamespacedKey('generation', 'status', id);
        },
        PROGRESS: (id: string) => {
            if (!validateChannelId(id)) {
                throw new Error(`Invalid channel ID: ${id}`);
            }
            return createNamespacedKey('generation', 'progress', id);
        }
    },
    CACHE: {
        REPORT: (channelId: string, timeframe: string) => {
            if (!validateChannelId(channelId)) {
                throw new Error(`Invalid channel ID: ${channelId}`);
            }
            if (!validateTimeframe(timeframe)) {
                throw new Error(`Invalid timeframe: ${timeframe}`);
            }
            return createNamespacedKey('cache', 'data', 'report', channelId, timeframe);
        }
    }
} as const;

export const TTL = {
    REPORT: {
        CACHE: 3600,       // 1 hour
        INDEX: 86400,      // 24 hours
        DATA: 604800       // 7 days
    },
    CHANNEL: {
        STATUS: 300,       // 5 minutes
        PROGRESS: 60       // 1 minute
    },
    GENERATION: {
        STATUS: 300,       // 5 minutes
        PROGRESS: 60       // 1 minute
    }
} as const;

// Key pattern utilities for operations
export const KEY_PATTERNS = {
    ALL_REPORTS: 'newsnow:report:*',
    ALL_CHANNELS: 'newsnow:channel:*',
    ALL_CACHE: 'newsnow:cache:*'
} as const; 