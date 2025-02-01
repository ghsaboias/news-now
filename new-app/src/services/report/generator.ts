import { ClaudeClient } from '@/types/claude';
import { OptimizedMessage } from '@/types/discord';
import { AISummary } from '@/types/report';
import { PerformanceTracker } from '@/utils/performance';
import fs from 'fs';
import path from 'path';

export class ReportGenerator {
    private readonly MAX_TOKENS = 4000;

    constructor(
        private readonly claudeClient: ClaudeClient,
        private readonly logger: Console = console
    ) { }

    private formatMessagesForClaude(messages: OptimizedMessage[]): string {
        return PerformanceTracker.track('report.formatMessages', () => {
            const sortedMessages = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            console.log("sortedMessages", sortedMessages)
            return sortedMessages
                .map((msg) => {
                    const timestamp = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

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
                    if (msg.embeds?.[0]?.title) parts.push(`Embed Title: ${msg.embeds[0].title}`);
                    if (msg.embeds?.[0]?.description) parts.push(`Embed Description: ${msg.embeds[0].description}`);

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
        });
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

            // Location should be the line immediately after headline
            const locationIndex = headlineIndex + 1;
            const location = lines[locationIndex].trim();

            // Find the sources section
            const sourcesIndex = lines.findIndex((line, index) =>
                index > locationIndex && line.toLowerCase().startsWith('sources')
            );

            if (sourcesIndex === -1) {
                throw new Error('Invalid summary format: no sources section found');
            }

            const headline = lines[headlineIndex];
            const body = lines.slice(locationIndex + 1, sourcesIndex).join('\n');

            // Parse sources section
            const sources: string[] = [];
            let currentSource = '';
            let isInSourceBlock = false;

            for (let i = sourcesIndex + 1; i < lines.length; i++) {
                const line = lines[i];

                // Skip empty lines between source blocks
                if (!line && !isInSourceBlock) continue;

                // Start of a new source block
                if (line.match(/^\[\w+\] @\w+/)) {
                    if (currentSource) {
                        sources.push(currentSource.trim());
                    }
                    currentSource = line;
                    isInSourceBlock = true;
                }
                // Source reference line (starts with superscript)
                else if (line.match(/^[¹²³⁴⁵⁶⁷⁸⁹]\[/)) {
                    if (currentSource) {
                        currentSource += '\n' + line;
                    } else {
                        currentSource = line;
                    }
                    isInSourceBlock = true;
                }
                // Additional source information (indented)
                else if (line.startsWith('  ') && isInSourceBlock) {
                    currentSource += '\n' + line;
                }
                // End of a source block
                else if (!line && isInSourceBlock) {
                    if (currentSource) {
                        sources.push(currentSource.trim());
                        currentSource = '';
                    }
                    isInSourceBlock = false;
                }
            }

            // Add the last source if any
            if (currentSource) {
                sources.push(currentSource.trim());
            }

            // Validate sources
            if (!sources.length) {
                throw new Error('Invalid summary format: no valid sources found');
            }

            if (!headline || !location || !body) {
                throw new Error('Invalid summary format: missing required components');
            }

            const summaryObj = {
                headline,
                location,
                body,
                sources,
                raw_response: text,
                timestamp: new Date().toISOString()
            };
            this.logger.log(`[Report Generator] Parsed summary: Headline: ${headline}, Location: ${location}, Body length: ${body.length}, Sources count: ${sources.length}`);
            return summaryObj;
        });
    }

    async createAISummary(
        messages: OptimizedMessage[],
        channelName: string,
        requestedHours: number,
        previousSummary?: AISummary
    ): Promise<AISummary | null> {
        console.log("messages!!", messages)
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
            const prompt = this.createPrompt(formattedText, previousSummary);
            this.logger.log(`[Report Generator] Timestamp distribution for ${channelName} (${requestedHours}h):`, Object.entries(timestampDistribution));
            this.logger.log(`[Report Generator] Generated prompt snippet: ${prompt.slice(0, 200)}...`);

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

                // Save snapshot data to claude_test.json
                try {
                    const snapshot = {
                        timestamp: new Date().toISOString(),
                        channelName,
                        messageCount: messages.length,
                        prompt, // prompt used for request
                        claudeResponse: response.content[0].text
                    };
                    const snapshotPath = path.join(process.cwd(), 'claude_test.json');
                    let existingSnapshots = [];
                    if (fs.existsSync(snapshotPath)) {
                        try {
                            const raw = fs.readFileSync(snapshotPath, 'utf8');
                            existingSnapshots = JSON.parse(raw);
                            if (!Array.isArray(existingSnapshots)) {
                                existingSnapshots = [];
                            }
                        } catch (e) {
                            existingSnapshots = [];
                        }
                    }
                    existingSnapshots.push(snapshot);
                    fs.writeFileSync(snapshotPath, JSON.stringify(existingSnapshots, null, 2));
                    this.logger.log(`[Report Generator] Saved snapshot to claude_test.json`);
                } catch (err) {
                    this.logger.error('Failed to save snapshot:', err);
                }

                this.logger.log(`[Report Generator] Raw response from Claude: ${response.content[0].text.slice(0, 200)}...`);
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
            - For each factual claim, add a superscript number (e.g. "text¹") that references the source
            - At the end of the report, add a "Sources:" section listing all referenced sources
            - Group sources by platform (Telegram/X) and handle
            - Format sources as follows:
              Sources (N messages):

              [Platform] @handle
              ¹[HH:mm] Quote used in summary
                Original: Full message content
                Link: t.me/handle or twitter.com/handle

              [Platform] @handle
              ²[HH:mm] Quote used in summary
                Original: Full message content
                Link: t.me/handle or twitter.com/handle
            - For each source, include:
              1. The superscript number used in the report
              2. The time in 24-hour format [HH:mm]
              3. The quote or content used in the summary
              4. The original full message content
              5. A link to the original post when available
            - Group all sources from the same platform and handle together
            - Show the total number of messages processed in the Sources header
        `;
    }
} 