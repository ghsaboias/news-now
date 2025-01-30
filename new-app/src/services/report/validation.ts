import { ChannelInfo } from '@/types';

// Validation error types
export class BulkGenerationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'BulkGenerationError';
    }
}

// Validation types
export interface BulkGenerationParams {
    timeframe: '1h' | '4h' | '24h';
    minMessages: number;
    batchSize?: number;
}

export interface BulkValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validChannels: ChannelInfo[];
    skippedChannels: Array<{
        channel: ChannelInfo;
        reason: string;
    }>;
}

// Validation functions
export class BulkGenerationValidator {
    private static readonly DEFAULT_BATCH_SIZE = 3;
    private static readonly MIN_MESSAGES_LIMITS = {
        '1h': 3,
        '4h': 6,
        '24h': 10
    };

    static validateParams(params: Partial<BulkGenerationParams>): BulkGenerationParams {
        const errors: string[] = [];

        // Validate timeframe
        if (!params.timeframe) {
            errors.push('Timeframe is required');
        } else if (!['1h', '4h', '24h'].includes(params.timeframe)) {
            errors.push('Invalid timeframe type');
        }

        // Validate minMessages
        if (params.minMessages === undefined) {
            errors.push('Minimum messages threshold is required');
        } else if (params.minMessages < 0) {
            errors.push('Minimum messages threshold must be non-negative');
        } else {
            const minLimit = this.MIN_MESSAGES_LIMITS[params.timeframe as keyof typeof this.MIN_MESSAGES_LIMITS] || 3;
            if (params.minMessages < minLimit) {
                errors.push(`Minimum messages threshold must be at least ${minLimit} for ${params.timeframe} timeframe`);
            }
        }

        // Validate batch size
        if (params.batchSize !== undefined && params.batchSize < 1) {
            errors.push('Batch size must be positive');
        }

        if (errors.length > 0) {
            throw new BulkGenerationError(
                `Invalid bulk generation parameters: ${errors.join(', ')}`,
                'INVALID_PARAMS'
            );
        }

        return {
            timeframe: params.timeframe as '1h' | '4h' | '24h',
            minMessages: params.minMessages!,
            batchSize: params.batchSize || this.DEFAULT_BATCH_SIZE
        };
    }

    static validateChannels(channels: ChannelInfo[]): BulkValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const validChannels: ChannelInfo[] = [];
        const skippedChannels: Array<{ channel: ChannelInfo; reason: string }> = [];

        if (!channels.length) {
            errors.push('No channels available for bulk generation');
            return {
                isValid: false,
                errors,
                warnings,
                validChannels: [],
                skippedChannels: []
            };
        }

        for (const channel of channels) {
            try {
                this.validateChannel(channel);
                validChannels.push(channel);
            } catch (error) {
                if (error instanceof BulkGenerationError) {
                    skippedChannels.push({
                        channel,
                        reason: error.message
                    });
                }
            }
        }

        if (validChannels.length === 0) {
            errors.push('No valid channels found for bulk generation');
        } else if (validChannels.length < channels.length) {
            warnings.push(`${skippedChannels.length} channels were skipped due to validation`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            validChannels,
            skippedChannels
        };
    }

    private static validateChannel(channel: ChannelInfo): void {
        if (!channel.id) {
            throw new BulkGenerationError('Channel ID is required', 'INVALID_CHANNEL_ID');
        }
        if (!channel.name) {
            throw new BulkGenerationError('Channel name is required', 'INVALID_CHANNEL_NAME');
        }
        if (!/^\d+$/.test(channel.id)) {
            throw new BulkGenerationError('Invalid channel ID format', 'INVALID_CHANNEL_ID_FORMAT');
        }
    }

    static validateQueueState(
        total: number,
        pending: number,
        processing: number,
        completed: number,
        error: number
    ): void {
        const errors: string[] = [];

        // Basic count validation
        if (total < 0) errors.push('Total count must be non-negative');
        if (pending < 0) errors.push('Pending count must be non-negative');
        if (processing < 0) errors.push('Processing count must be non-negative');
        if (completed < 0) errors.push('Completed count must be non-negative');
        if (error < 0) errors.push('Error count must be non-negative');

        // Sum validation
        const sum = pending + processing + completed + error;
        if (sum !== total) {
            errors.push(`Queue state mismatch: sum of states (${sum}) does not match total (${total})`);
        }

        if (errors.length > 0) {
            throw new BulkGenerationError(
                `Invalid queue state: ${errors.join(', ')}`,
                'INVALID_QUEUE_STATE'
            );
        }
    }

    static validateEventStream(event: { type: string; data: any }): void {
        const validEventTypes = ['channels', 'status', 'progress', 'complete', 'error'];

        if (!validEventTypes.includes(event.type)) {
            throw new BulkGenerationError(
                `Invalid event type: ${event.type}`,
                'INVALID_EVENT_TYPE'
            );
        }

        if (!event.data) {
            throw new BulkGenerationError(
                'Event data is required',
                'INVALID_EVENT_DATA'
            );
        }

        // Validate specific event types
        switch (event.type) {
            case 'channels':
                if (!Array.isArray(event.data.channels)) {
                    throw new BulkGenerationError(
                        'Channels event must contain an array of channels',
                        'INVALID_CHANNELS_DATA'
                    );
                }
                break;

            case 'status':
                this.validateQueueState(
                    event.data.total,
                    event.data.pending,
                    event.data.processing,
                    event.data.completed,
                    event.data.error
                );
                break;

            case 'progress':
                if (!event.data.channelId || !event.data.status) {
                    throw new BulkGenerationError(
                        'Progress event must contain channelId and status',
                        'INVALID_PROGRESS_DATA'
                    );
                }
                break;

            case 'complete':
                if (typeof event.data.total !== 'number') {
                    throw new BulkGenerationError(
                        'Complete event must contain total count',
                        'INVALID_COMPLETE_DATA'
                    );
                }
                break;

            case 'error':
                if (!event.data.error) {
                    throw new BulkGenerationError(
                        'Error event must contain error message',
                        'INVALID_ERROR_DATA'
                    );
                }
                break;
        }
    }
} 