import { AISummary, ClaudeClient, DiscordMessage } from '@/types';

export class ReportGenerator {
    private readonly MAX_TOKENS = 4000;

    constructor(
        private readonly claudeClient: ClaudeClient,
        private readonly logger: Console = console
    ) { }

    private formatMessagesForClaude(messages: DiscordMessage[]): string {
        return messages
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map((msg) => {
                const timestamp = new Date(msg.timestamp)
                    .toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });

                const parts = [`[${timestamp}]`];

                // Extract platform and handle from content
                let platform = '';
                let handle = '';

                if (msg.content.includes('twitter.com/')) {
                    platform = 'X';
                    const match = msg.content.match(/twitter\.com\/([^\/]+)/);
                    if (match) handle = match[1];
                } else if (msg.content.includes('t.me/')) {
                    platform = 'Telegram';
                    const match = msg.content.match(/t\.me\/([^\/]+)/);
                    if (match) handle = match[1];
                }

                // If not found in content, try embed title
                if (!platform && msg.embeds?.[0]?.title) {
                    const title = msg.embeds[0].title.toLowerCase();
                    if (title.includes('telegram:')) {
                        platform = 'Telegram';
                        const match = title.replace(/telegram:\s*/i, '').match(/@?([a-zA-Z0-9_]+)/);
                        if (match) handle = match[1];
                    } else if (title.includes('x:') || title.includes('twitter:')) {
                        platform = 'X';
                        const match = title.replace(/(?:x|twitter):\s*/i, '').match(/@?([a-zA-Z0-9_]+)/);
                        if (match) handle = match[1];
                    }
                }

                // Add platform and handle if found
                if (platform && handle) {
                    parts.push(`[${platform}] @${handle.replace(/^@/, '')}`);
                }

                // Add URL (from content)
                if (msg.content) {
                    parts.push(`Original: ${msg.content}`);
                }

                // Add embed information
                const embeds = msg.embeds || [];
                embeds.forEach((embed) => {
                    if (embed.title) parts.push(`Channel: ${embed.title}`);
                    if (embed.description) parts.push(`Content: ${embed.description}`);
                });

                // Add fields (quotes, translations, etc.)
                const fields = msg.embeds?.[0]?.fields || [];
                fields.forEach((field) => {
                    if (field.name.toLowerCase().includes('quote from')) {
                        const attribution = field.name.replace(/quote from:?\s*/i, '').trim();
                        parts.push(`Quote from ${attribution}: ${field.value}`);
                    } else if (field.name.toLowerCase() === 'translated from') {
                        parts.push(`[Translated from ${field.value}]`);
                    } else if (field.name.toLowerCase() !== 'source') { // Skip source as we have the URL
                        parts.push(`${field.name}: ${field.value}`);
                    }
                });

                // Add link if available
                if (msg.content) {
                    if (platform === 'Telegram' && handle) {
                        parts.push(`Link: t.me/${handle}`);
                    } else if (platform === 'X' && handle) {
                        parts.push(`Link: twitter.com/${handle}`);
                    }
                }

                return parts.join('\n');
            })
            .join('\n\n');
    }

    private validateSource(source: string): boolean {
        // Source format: "¹[YYYY-MM-DD HH:mm:ss UTC] content" or "¹⁰[YYYY-MM-DD HH:mm:ss UTC] content"
        const sourcePattern = /^(?:[¹²³⁴⁵⁶⁷⁸⁹][⁰¹²³⁴⁵⁶⁷⁸⁹]?)\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\s+UTC\]/;
        return sourcePattern.test(source);
    }

    private parseAISummary(text: string): AISummary {
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

        if (lines.length < 3) {
            throw new Error('Invalid summary format: insufficient lines');
        }

        // Find the headline (first line in ALL CAPS)
        const headlineIndex = lines.findIndex(line =>
            line === line.toUpperCase() && line.length > 0
        );

        if (headlineIndex === -1) {
            throw new Error('Invalid summary format: no headline found');
        }

        // Location should be the line immediately after headline
        const locationIndex = headlineIndex + 1;
        const location = lines[locationIndex].trim();

        const headline = lines[headlineIndex];
        const body = lines.slice(locationIndex + 1, lines.length).join('\n');

        if (!headline || !location || !body) {
            throw new Error('Invalid summary format: missing required components');
        }

        return {
            headline,
            location,
            body,
            raw_response: text,
            timestamp: new Date().toISOString(),
            period_start: new Date().toISOString(),
            period_end: new Date().toISOString()
        };
    }

    async createAISummary(
        messages: DiscordMessage[],
        channelName: string,
        requestedHours: number,
        previousSummary?: AISummary
    ): Promise<AISummary | null> {
        // Check for empty messages array and log the event
        if (!messages.length) {
            this.logger.info(`[Report Generator] No messages found for channel ${channelName} in the last ${requestedHours} hours`);
            // We return null here, but the API layer will handle this case specifically
            return null;
        }

        // Debug: Log message timestamp distribution
        const timestampDistribution: { [key: string]: number } = {};
        for (const msg of messages) {
            const hourKey = new Date(msg.timestamp).toISOString().slice(0, 13);
            timestampDistribution[hourKey] = (timestampDistribution[hourKey] || 0) + 1;
        }

        console.log(`[Report Generator] Message timestamp distribution for ${channelName} (${requestedHours}h):`,
            Object.entries(timestampDistribution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([hour, count]) => `\n  ${hour}Z: ${count} messages`)
                .join('')
        );

        const formattedText = this.formatMessagesForClaude(messages);

        try {
            const response = await this.claudeClient.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: this.MAX_TOKENS,
                system: 'You are an experienced news wire journalist creating concise, clear updates. Your task is to report the latest developments while maintaining narrative continuity with previous coverage. Focus on what\'s new and noteworthy, using prior context only when it enhances understanding of current events.',
                messages: [
                    {
                        role: 'user',
                        content: this.createPrompt(formattedText, previousSummary),
                    },
                ],
            });

            if (!response?.content?.[0]?.text) {
                this.logger.error('Claude returned empty response');
                return null;
            }
            return this.parseAISummary(response.content[0].text);
        } catch (error) {
            this.logger.error('Error generating summary:', error);
            return null;
        }
    }

    private createPrompt(formattedText: string, previousSummary?: AISummary): string {
        let previousSummaryText = '';
        if (previousSummary?.period_start && previousSummary?.period_end) {
            const prevStart = new Date(previousSummary.period_start);
            const prevEnd = new Date(previousSummary.period_end);
            previousSummaryText = `CONTEXT FROM PREVIOUS REPORT
                Time period: ${prevStart.toLocaleString()} to ${prevEnd.toLocaleString()} UTC

                ${previousSummary.raw_response}

                -------------------
                NEW UPDATES TO INCORPORATE
            `;
        }

        return `Create a concise, journalistic report covering the key developments, incorporating context from the previous report when relevant.

            ${previousSummaryText} Updates to analyze:
            ${formattedText}

            Requirements:
            - Start with ONE clear and specific headline in ALL CAPS
            - Second line must be in format: "City" (just the location name, no date)
            - First paragraph must summarize the most important verified development, including key names, numbers, locations, dates, etc.
            - Subsequent paragraphs should cover other significant developments
            - Do NOT include additional headlines - weave all events into a cohesive narrative
            - Only include verified facts and direct quotes from official statements
            - Maintain strictly neutral tone - avoid loaded terms or partisan framing
            - NO analysis, commentary, or speculation
            - NO use of terms like "likely", "appears to", or "is seen as"
            - Remove any # that might be in the developments
        `;
    }
} 