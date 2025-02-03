import { ClaudeClient } from '@/types/claude';
import { DiscordMessage } from '@/types/discord';
import { AISummary } from '@/types/report';
import { PerformanceTracker } from '@/utils/performance';

export class ReportGenerator {
    private readonly MAX_TOKENS = 4000;

    constructor(
        private readonly claudeClient: ClaudeClient,
        private readonly logger: Console = console
    ) { }

    private formatMessagesForClaude(messages: DiscordMessage[]): string {
        console.log("MESSAGES", messages)
        return PerformanceTracker.track('report.formatMessages', () => {
            const sortedMessages = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            return sortedMessages
                .map((msg) => {
                    const timestamp = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
                    const parts = [`[${timestamp}]`];

                    if (msg.content && msg.content.startsWith('http')) {
                        try {
                            const url = new URL(msg.content);
                            let platform = '';
                            let handle = '';
                            if (url.host.includes('twitter.com')) {
                                platform = 'X';
                                handle = url.pathname.split('/')[1];
                            } else if (url.host.includes('t.me')) {
                                platform = 'Telegram';
                                handle = url.pathname.split('/')[1];
                            }
                            if (platform && handle) {
                                parts.push(`[${platform}] @${url}`);
                            }
                        } catch (e) {
                            console.error("Error parsing URL", e)
                        }
                    } else {
                    }

                    if (msg.embeds?.[0]?.title) parts.push(`  Embed Title: ${msg.embeds[0].title}`);
                    if (msg.embeds?.[0]?.description) parts.push(`  Embed Description: ${msg.embeds[0].description}`);

                    return parts.join('\n');
                })
                .join('\n\n');
        });
    }

    async createAISummary(
        messages: DiscordMessage[],
        channelName: string,
        requestedHours: number,
        previousSummary?: AISummary
    ): Promise<AISummary | null> {
        return PerformanceTracker.track('report.createSummary', async () => {
            if (!messages.length) return null;

            const formattedText = this.formatMessagesForClaude(messages);
            const prompt = this.createPrompt(formattedText, previousSummary);
            try {
                const response = await PerformanceTracker.track('report.claudeRequest', () =>
                    this.claudeClient.messages.create({
                        model: 'claude-3-haiku-20240307',
                        max_tokens: this.MAX_TOKENS,
                        system: 'You are an experienced news wire journalist creating concise, clear updates. Your task is to report the latest developments while maintaining narrative continuity with previous coverage. Focus on what\'s new and noteworthy, using prior context only when it enhances understanding of current events.',
                        messages: [
                            {
                                role: 'user',
                                content: prompt,
                            },
                        ],
                    })
                    , { messageCount: messages.length });

                if (!response?.content?.[0]?.text) {
                    this.logger.error('Claude returned empty response');
                    return null;
                }

                const text = response.content[0].text;
                console.log("RESPONSE", text);

                // Parse the response into headline, location, and body
                const lines = text.split('\n').filter(line => line.trim());
                const headline = lines[0];
                const location = lines[1];
                const body = lines.slice(2).join('\n').trim();

                return {
                    headline,
                    location,
                    body,
                    raw_response: text,
                    timestamp: new Date().toISOString(),
                };

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
                Time period: ${prevStart.toISOString()} to ${prevEnd.toISOString()}

                ${previousSummary.raw_response}

                -------------------
                NEW UPDATES TO INCORPORATE
            `;
        }

        return `Create a concise, journalistic report covering the key developments, incorporating context from the previous report when relevant. Focus on the most important recent developments.

            ${previousSummaryText} Updates to analyze:
            ${formattedText}

            Requirements:
            - Start with ONE clear and specific headline in ALL CAPS
            - Second line must be in format: "City" (just the location name, no date)
            - First paragraph must summarize the most important verified development, including key names, numbers, locations, dates, etc.
            - Subsequent paragraphs should cover other significant developments
            - Do NOT include additional headlines - weave all events into a cohesive narrative
            - Maximum 4096 characters, average 3200 characters
            - Only include verified facts and direct quotes from official statements
            - Maintain strictly neutral tone - avoid loaded terms or partisan framing
            - NO analysis, commentary, or speculation
            - NO use of terms like "likely", "appears to", or "is seen as"
            - Remove any # that might be in the developments
        `;
    }
} 