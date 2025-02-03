import { DiscordMessage } from '@/types/discord';
import { SourceService } from '../redis/sources';

export class SourceExtractor {
    private sourceService: SourceService;

    constructor(sourceService: SourceService) {
        this.sourceService = sourceService;
    }

    async extractFromMessage(message: DiscordMessage): Promise<boolean> {
        // Only process messages with embeds
        if (!message.embeds?.length) {
            return false;
        }

        // Extract from URL in content
        if (message.content.includes('twitter.com/')) {
            const match = message.content.match(/twitter\.com\/([^\/]+)/);
            if (match) {
                await this.processSource(message, 'x', match[1]);
                return true;
            }
        }

        if (message.content.includes('t.me/')) {
            const match = message.content.match(/t\.me\/([^\/]+)/);
            if (match) {
                await this.processSource(message, 'telegram', match[1]);
                return true;
            }
        }

        // Check embed fields for quotes and use the attribution as source
        const quoteFields = message.embeds?.[0]?.fields?.filter(f =>
            f.name.toLowerCase().includes('quote from')
        );

        if (quoteFields?.length) {
            for (const field of quoteFields) {
                const attribution = field.name.replace(/quote from:?\s*/i, '').trim();
                if (attribution) {
                    // Default to X/Twitter if no platform specified since most quotes are from there
                    await this.processSource(message, 'x', attribution.replace(/^@/, ''));
                    return true;
                }
            }
        }

        // If no URL or quote found but has embeds, try to extract from embed title
        if (message.embeds?.[0]?.title) {
            // Try to extract platform and handle from title
            const title = message.embeds[0].title.toLowerCase();
            let platform: 'telegram' | 'x' | null = null;
            let handle: string | null = null;

            if (title.includes('telegram:')) {
                platform = 'telegram';
                const match = title.replace(/telegram:\s*/i, '').match(/@?([a-zA-Z0-9_]+)/);
                if (match) handle = match[1];
            } else if (title.includes('x:') || title.includes('twitter:')) {
                platform = 'x';
                const match = title.replace(/(?:x|twitter):\s*/i, '').match(/@?([a-zA-Z0-9_]+)/);
                if (match) handle = match[1];
            }

            if (platform && handle) {
                await this.processSource(message, platform, handle);
                return true;
            }
        }

        console.log('No source URL found in content');
        return false;
    }

    private async processSource(message: DiscordMessage, platform: 'telegram' | 'x', handle: string): Promise<void> {
        // Remove @ prefix if present
        handle = handle.replace(/^@/, '');

        // Try to find existing source
        const existingSource = await this.sourceService.getByHandle(platform, handle);

        // Update message with source info
        message.platform = platform;
        message.handle = handle;

        if (existingSource) {
            // Update last_seen_at if the message is newer
            if (message.timestamp > existingSource.last_seen_at) {
                await this.sourceService.create({
                    ...existingSource,
                    timestamp: message.timestamp
                });
            }
            return;
        }

        // Create new source
        const source = {
            platform,
            handle,
            timestamp: message.timestamp
        };

        await this.sourceService.create(source);
    }
} 