import { AISummary, ClaudeClient, DiscordMessage } from '@/types';

export class ReportGenerator {
    constructor(
        private readonly claudeClient: ClaudeClient,
        private readonly logger: Console = console
    ) { }

    private formatMessagesForClaude(messages: DiscordMessage[]): string {
        return messages
            .map((msg) => {
                const timestamp = new Date(msg.timestamp)
                    .toISOString()
                    .replace('T', ' ')
                    .replace(/\.\d+Z$/, ' UTC');

                const content = msg.content || '';
                const embeds = (msg as any).embeds || [];

                const embedText = embeds
                    .map((embed: any) => {
                        const parts = [];
                        if (embed.title) parts.push(`Title: ${embed.title}`);
                        if (embed.description) parts.push(`Description: ${embed.description}`);

                        const fields = embed.fields || [];
                        fields.forEach((field: any) => {
                            if (field.name.toLowerCase() !== 'source') {
                                parts.push(`${field.name}: ${field.value}`);
                            }
                        });

                        return parts.join('\n');
                    })
                    .filter(Boolean)
                    .join('\n');

                const messageText = `[${timestamp}]\n${content}${embedText ? '\n' + embedText : ''
                    }`;
                return messageText;
            })
            .join('\n---\n');
    }

    private parseAISummary(text: string): AISummary {
        // Split into lines and remove empty lines
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
            /\d{1,2},?\s+\d{4}/.test(line) // Matches date formats
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
        const sources = lines.slice(sourcesIndex + 1);

        // Validate required components
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
    }


    async createAISummary(
        messages: DiscordMessage[],
        channelName: string,
        requestedHours: number,
        previousSummary?: AISummary
    ): Promise<AISummary | null> {
        if (!messages.length) return null;

        // Calculate time period
        const timestamps = messages.map((msg) => new Date(msg.timestamp));
        const periodStart = new Date(Math.min(...timestamps.map(t => t.getTime())));
        const periodEnd = new Date(Math.max(...timestamps.map(t => t.getTime())));

        const formattedText = this.formatMessagesForClaude(messages);

        // Format previous summary context
        let previousSummaryText = '';
        if (previousSummary && previousSummary.period_start && previousSummary.period_end) {
            const prevStart = new Date(previousSummary.period_start);
            const prevEnd = new Date(previousSummary.period_end);

            previousSummaryText = `CONTEXT FROM PREVIOUS REPORT
      Time period: ${prevStart.toLocaleString()} to ${prevEnd.toLocaleString()} UTC

      ${previousSummary.raw_response}

      -------------------
      NEW UPDATES TO INCORPORATE
      `;
        }

        const prompt = `Create a concise, journalistic report covering the key developments, incorporating context from the previous report when relevant.

    ${previousSummaryText} Updates to analyze:
    ${formattedText}

    Requirements:
    - Start with ONE headline in ALL CAPS that captures the most significant development
    - Second line must be in format: City • Month Day, Year (use location of main development)
    - First paragraph must summarize the most important verified development, including key names, numbers, locations, dates, etc.
    - Subsequent paragraphs should cover other significant developments
    - Do NOT include additional headlines - weave all events into a cohesive narrative
    - Maximum 4096 characters, average 2500 characters
    - Only include verified facts and direct quotes from official statements
    - Maintain strictly neutral tone - avoid loaded terms or partisan framing
    - NO analysis, commentary, or speculation
    - NO use of terms like "likely", "appears to", or "is seen as"
    - Remove any # that might be in the developments
    - For each factual claim, add a superscript number (e.g. "text¹") that references the source
    - At the end of the report, add a "Sources:" section listing all referenced sources with their corresponding numbers
    - Format sources as: "¹[Timestamp] Message content"
    `;

        try {
            const response = await this.claudeClient.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 800,
                system: 'You are an experienced news wire journalist creating concise, clear updates. Your task is to report the latest developments while maintaining narrative continuity with previous coverage. Focus on what\'s new and noteworthy, using prior context only when it enhances understanding of current events.',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            if (!response?.content?.[0]?.text) {
                this.logger.error('Claude returned empty response');
                return null;
            }

            this.logger.debug(`Raw Claude response:\n${response.content[0].text}`);

            const summary = this.parseAISummary(response.content[0].text);
            summary.period_start = periodStart.toISOString();
            summary.period_end = periodEnd.toISOString();

            return summary;
        } catch (error) {
            this.logger.error('Unexpected error generating summary:', error);
            return null;
        }
    }
} 