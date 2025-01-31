import { DiscordMessage } from '@/types/discord';

// Validation error types
export class MessageValidationError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'MessageValidationError';
    }
}

// Validation interfaces
export interface MessageQueryParams {
    channelId: string;
    timeframe: '1h' | '4h' | '24h';
    before?: string;
    after?: string;
    limit?: number;
}

export interface MessageValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    validMessages: DiscordMessage[];
    skippedMessages: Array<{
        message: DiscordMessage;
        reason: string;
    }>;
}

export interface TimeframeWindow {
    start: Date;
    end: Date;
}

// Message Validator class
export class MessageValidator {
    private static readonly MAX_MESSAGES = 100;
    private static readonly MIN_MESSAGES = 1;
    private static readonly TIMEFRAME_HOURS = {
        '1h': 1,
        '4h': 4,
        '24h': 24
    };

    static validateQueryParams(params: Partial<MessageQueryParams>): MessageQueryParams {
        const errors: string[] = [];

        // Validate channelId
        if (!params.channelId) {
            errors.push('Channel ID is required');
        } else if (!/^\d+$/.test(params.channelId)) {
            errors.push('Invalid channel ID format');
        }

        // Validate timeframe
        if (!params.timeframe) {
            errors.push('Timeframe is required');
        } else if (!['1h', '4h', '24h'].includes(params.timeframe)) {
            errors.push('Invalid timeframe type');
        }

        // Validate limit
        if (params.limit !== undefined) {
            if (params.limit < this.MIN_MESSAGES) {
                errors.push(`Limit must be at least ${this.MIN_MESSAGES}`);
            } else if (params.limit > this.MAX_MESSAGES) {
                errors.push(`Limit cannot exceed ${this.MAX_MESSAGES}`);
            }
        }

        // Validate before/after timestamps
        if (params.before && !this.isValidTimestamp(params.before)) {
            errors.push('Invalid before timestamp');
        }
        if (params.after && !this.isValidTimestamp(params.after)) {
            errors.push('Invalid after timestamp');
        }

        if (errors.length > 0) {
            throw new MessageValidationError(
                `Invalid message query parameters: ${errors.join(', ')}`,
                'INVALID_QUERY_PARAMS'
            );
        }

        return {
            channelId: params.channelId!,
            timeframe: params.timeframe as '1h' | '4h' | '24h',
            before: params.before,
            after: params.after,
            limit: params.limit || this.MAX_MESSAGES
        };
    }

    static validateMessages(messages: DiscordMessage[], timeframe: TimeframeWindow): MessageValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const validMessages: DiscordMessage[] = [];
        const skippedMessages: Array<{ message: DiscordMessage; reason: string }> = [];

        if (!messages.length) {
            errors.push('No messages to validate');
            return {
                isValid: false,
                errors,
                warnings,
                validMessages: [],
                skippedMessages: []
            };
        }

        for (const message of messages) {
            try {
                this.validateMessage(message, timeframe);
                validMessages.push(message);
            } catch (error) {
                if (error instanceof MessageValidationError) {
                    skippedMessages.push({
                        message,
                        reason: error.message
                    });
                }
            }
        }

        if (validMessages.length === 0) {
            errors.push('No valid messages found');
        } else if (validMessages.length < messages.length) {
            warnings.push(`${skippedMessages.length} messages were skipped due to validation`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            validMessages,
            skippedMessages
        };
    }

    private static validateMessage(message: DiscordMessage, timeframe: TimeframeWindow): void {
        if (!message.id) {
            throw new MessageValidationError('Message ID is required', 'INVALID_MESSAGE_ID');
        }
        if (!message.timestamp) {
            throw new MessageValidationError('Message timestamp is required', 'INVALID_TIMESTAMP');
        }

        const messageTime = new Date(message.timestamp);
        if (isNaN(messageTime.getTime())) {
            throw new MessageValidationError('Invalid message timestamp', 'INVALID_TIMESTAMP_FORMAT');
        }

        if (messageTime < timeframe.start || messageTime > timeframe.end) {
            throw new MessageValidationError(
                'Message timestamp outside timeframe window',
                'MESSAGE_OUTSIDE_TIMEFRAME'
            );
        }

        // Validate message content or embeds exist
        if (!message.content && (!message.embeds || message.embeds.length === 0)) {
            throw new MessageValidationError(
                'Message must have content or embeds',
                'EMPTY_MESSAGE'
            );
        }
    }

    private static isValidTimestamp(timestamp: string): boolean {
        const date = new Date(timestamp);
        return !isNaN(date.getTime());
    }

    static getTimeframeWindow(timeframe: '1h' | '4h' | '24h', referenceTime: Date = new Date()): TimeframeWindow {
        const hours = this.TIMEFRAME_HOURS[timeframe];
        return {
            start: new Date(referenceTime.getTime() - (hours * 60 * 60 * 1000)),
            end: referenceTime
        };
    }
} 