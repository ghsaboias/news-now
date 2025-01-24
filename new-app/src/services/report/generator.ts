import { AISummary, ClaudeClient, DiscordMessage } from '@/types';
import { PerformanceTracker } from '@/utils/performance';

interface MessageEmbed {
    title?: string;
    description?: string;
}

interface MessageField {
    name: string;
    value: string;
}

export class ReportGenerator {
    private readonly MAX_TOKENS = 1500;

    constructor(
        private readonly claudeClient: ClaudeClient,
        private readonly logger: Console = console
    ) { }

    private formatMessagesForClaude(messages: DiscordMessage[]): string {
        return PerformanceTracker.track('report.formatMessages', () => {
            return messages
                .map((msg) => {
                    const timestamp = new Date(msg.timestamp)
                        .toISOString()
                        .replace('T', ' ')
                        .replace(/\.\d+Z$/, ' UTC');

                    const parts = [`[${timestamp}]`];

                    // Add URL (from content)
                    if (msg.content) {
                        parts.push(msg.content);
                    }

                    // Add embed information
                    const embeds = (msg as DiscordMessage & { embeds?: MessageEmbed[] }).embeds || [];
                    embeds.forEach((embed: MessageEmbed) => {
                        if (embed.title) parts.push(`Channel: ${embed.title}`);
                        if (embed.description) parts.push(`Content: ${embed.description}`);
                    });

                    // Add fields (quotes, translations, etc.)
                    const fields = (msg as DiscordMessage & { fields?: MessageField[] }).fields || [];
                    fields.forEach((field: MessageField) => {
                        if (field.name.toLowerCase() === 'quote from') {
                            parts.push(`Quote from ${field.value}`);
                        } else if (field.name.toLowerCase() === 'translated from') {
                            parts.push(`[Translated from ${field.value}]`);
                        } else if (field.name.toLowerCase() !== 'source') { // Skip source as we have the URL
                            parts.push(`${field.name}: ${field.value}`);
                        }
                    });

                    return parts.join('\n');
                })
                .join('\n---\n');
        }, { messageCount: messages.length });
    }

    private validateSource(source: string): boolean {
        // Source format: "¹[YYYY-MM-DD HH:mm:ss UTC] content" or "¹⁰[YYYY-MM-DD HH:mm:ss UTC] content"
        const sourcePattern = /^(?:[¹²³⁴⁵⁶⁷⁸⁹][⁰¹²³⁴⁵⁶⁷⁸⁹]?)\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\s+UTC\]/;
        return sourcePattern.test(source);
    }

    private parseAISummary(text: string): AISummary {
        return PerformanceTracker.track('report.parseSummary', () => {
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

            // Find the location line (contains "•" and a date)
            const locationIndex = lines.findIndex((line, index) =>
                index > headlineIndex &&
                line.includes('•') &&
                /\d{1,2},?\s+\d{4}/.test(line)
            );

            if (locationIndex === -1) {
                throw new Error('Invalid summary format: no location/date line found');
            }

            // Find the sources section
            const sourcesIndex = lines.findIndex((line, index) =>
                index > locationIndex && line.toLowerCase().startsWith('sources:')
            );

            if (sourcesIndex === -1) {
                throw new Error('Invalid summary format: no sources section found');
            }

            const headline = lines[headlineIndex];
            const location = lines[locationIndex];
            const body = lines.slice(locationIndex + 1, sourcesIndex).join('\n');
            let sources = lines.slice(sourcesIndex + 1);

            // Validate and clean sources
            sources = sources.filter(source => {
                const isValid = this.validateSource(source);
                if (!isValid) {
                    this.logger.warn('Invalid or truncated source found:', source);
                }
                return isValid;
            });

            if (!headline || !location || !body || !sources.length) {
                throw new Error('Invalid summary format: missing required components');
            }

            return {
                headline,
                location_and_period: location,
                body,
                sources,
                raw_response: text,
                timestamp: new Date().toISOString()
            };
        }, { textLength: text.length });
    }

    async createAISummary(
        messages: DiscordMessage[],
        channelName: string,
        requestedHours: number,
        previousSummary?: AISummary
    ): Promise<AISummary | null> {
        return PerformanceTracker.track('report.createSummary', async () => {
            if (!messages.length) return null;

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
                const response = await PerformanceTracker.track('report.claudeRequest', () =>
                    this.claudeClient.messages.create({
                        model: 'claude-3-haiku-20240307',
                        max_tokens: this.MAX_TOKENS,
                        system: 'You are an experienced news wire journalist creating concise, clear updates. Your task is to report the latest developments while maintaining narrative continuity with previous coverage. Focus on what\'s new and noteworthy, using prior context only when it enhances understanding of current events.',
                        messages: [
                            {
                                role: 'user',
                                content: this.createPrompt(formattedText, previousSummary),
                            },
                        ],
                    })
                    , { messageCount: messages.length });

                if (!response?.content?.[0]?.text) {
                    this.logger.error('Claude returned empty response');
                    return null;
                }

                return this.parseAISummary(response.content[0].text);
            } catch (error) {
                this.logger.error('Error generating summary:', error);
                return null;
            }
        }, {
            channelName,
            messageCount: messages.length,
            requestedHours,
            hasPreviousSummary: !!previousSummary
        });
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
            - Start with ONE headline in ALL CAPS that captures the most significant development
            - Second line must be in format: City • Month Day, Year (use location of main development)
            - First paragraph must summarize the most important verified development, including key names, numbers, locations, dates, etc.
            - Subsequent paragraphs should cover other significant developments
            - Do NOT include additional headlines - weave all events into a cohesive narrative
            - Maximum 4096 characters, average 3200 characters
            - Only include verified facts and direct quotes from official statements
            - Maintain strictly neutral tone - avoid loaded terms or partisan framing
            - NO analysis, commentary, or speculation
            - NO use of terms like "likely", "appears to", or "is seen as"
            - Remove any # that might be in the developments
            - For each factual claim, add a superscript number (e.g. "text¹") that references the source
            - At the end of the report, add a "Sources:" section listing all referenced sources with their corresponding numbers
            - Format sources as: "¹[Timestamp] Message content"
            - Ensure each source entry is complete with timestamp and content
            - Each source MUST follow the exact format: superscript number + [YYYY-MM-DD HH:mm:ss UTC] + content
        `;
    }
} 