import { DiscordMessage, ExtractedSource } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../db';

export class SourceExtractor {
    constructor(private db: DatabaseService) { }

    extractFromMessage(message: DiscordMessage): ExtractedSource | null {
        console.log('Attempting to extract source from message:', {
            content: message.content,
            hasEmbeds: (message.embeds?.length || 0) > 0
        });

        // Only process messages with embeds
        if (!message.embeds?.length) {
            return null;
        }

        // Extract from URL in content
        if (message.content.includes('twitter.com/')) {
            const match = message.content.match(/twitter\.com\/([^\/]+)/);
            if (match) {
                return this.processSource('x', match[1], message.timestamp);
            }
        }

        if (message.content.includes('t.me/')) {
            const match = message.content.match(/t\.me\/([^\/]+)/);
            if (match) {
                return this.processSource('telegram', match[1], message.timestamp);
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
                    return this.processSource('x', attribution.replace(/^@/, ''), message.timestamp);
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
                return this.processSource(platform, handle, message.timestamp);
            }
        }

        console.log('No source URL found in content');
        return null;
    }

    private processSource(platform: 'telegram' | 'x', handle: string, timestamp: string): ExtractedSource {
        // Remove @ prefix if present
        handle = handle.replace(/^@/, '');

        // Try to find existing source
        const existingSource = this.db.getSourceByHandle(platform, handle);

        if (existingSource) {
            // Update last_seen_at if the message is newer
            if (timestamp > existingSource.last_seen_at) {
                this.db.insertSource({
                    ...existingSource,
                    last_seen_at: timestamp
                });
            }
            return {
                id: existingSource.id,
                platform,
                handle,
                timestamp
            };
        }

        // Create or update source
        const source = {
            id: `src_${platform}_${handle}_${uuidv4()}`,
            platform,
            handle,
            first_seen_at: timestamp,
            last_seen_at: timestamp
        };

        this.db.insertSource(source);
        return {
            id: source.id,
            platform,
            handle,
            timestamp
        };
    }

    async getSourceById(id: string): Promise<ExtractedSource | undefined> {
        return this.db.getSourceById(id);
    }
} 