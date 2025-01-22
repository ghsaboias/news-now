import { ExtractedSource, SourceExtractorMessage } from '@/types/source';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../db';

export class SourceExtractor {
    constructor(private db: DatabaseService) { }

    extractFromMessage(message: SourceExtractorMessage): ExtractedSource | null {
        console.log('Attempting to extract source from message:', {
            content: message.content,
            hasEmbeds: message.embeds?.length > 0
        });

        // Extract from URL in content
        if (message.content.includes('twitter.com/')) {
            const match = message.content.match(/twitter\.com\/([^\/]+)/);
            console.log('Twitter URL match:', { match });
            if (match) {
                return this.processSource('x', match[1], message.timestamp);
            }
        }

        if (message.content.includes('t.me/')) {
            const match = message.content.match(/t\.me\/([^\/]+)/);
            console.log('Telegram URL match:', { match });
            if (match) {
                return this.processSource('telegram', match[1], message.timestamp);
            }
        }

        console.log('No source URL found in content');
        return null;
    }

    private processSource(platform: 'telegram' | 'x', handle: string, timestamp: string): ExtractedSource {
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
} 