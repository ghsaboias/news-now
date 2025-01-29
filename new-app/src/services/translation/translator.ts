import { AISummary, ClaudeClient, Translation } from '@/types';
import { PerformanceTracker } from '@/utils/performance';

export class TranslationService {
    constructor(
        private readonly claudeClient: ClaudeClient,
        private readonly logger: Console = console
    ) { }

    async translateSummary(
        summary: AISummary,
        targetLanguage: string
    ): Promise<Translation | null> {
        return PerformanceTracker.track('translation.generate', async () => {
            try {
                const response = await this.claudeClient.messages.create({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 4000,
                    system: 'You are a professional translator specializing in news translation. Your task is to translate news reports while maintaining their journalistic style, format, and factual accuracy.',
                    messages: [
                        {
                            role: 'user',
                            content: this.createTranslationPrompt(summary, targetLanguage),
                        },
                    ],
                });

                if (!response?.content?.[0]?.text) {
                    this.logger.error('Claude returned empty translation');
                    return null;
                }

                return this.parseTranslation(response.content[0].text, targetLanguage);
            } catch (error) {
                this.logger.error('Error generating translation:', error);
                return null;
            }
        }, { targetLanguage });
    }

    private createTranslationPrompt(summary: AISummary, targetLanguage: string): string {
        return `Translate the following news report to ${targetLanguage}. Maintain the exact same format and structure.
        
        Original report to translate:
        ${summary.headline}
        ${summary.location}
        ${summary.body}

        Requirements:
        - Translate ONLY the headline, location, and body
        - Keep the headline in ALL CAPS
        - Maintain all superscript numbers (e.g. "text¹") exactly as they appear
        - Do not translate proper names, including person names, organization names, and place names unless they have official translations in the target language
        - Do not translate source references
        - Maintain the same paragraph structure
        - Preserve all formatting, including newlines and spacing
        - Return in exactly this format:
        TRANSLATED_HEADLINE
        Translated_Location
        Translated_Body

        Note: The translation should read naturally in ${targetLanguage} while maintaining the professional, journalistic style of the original.`;
    }

    private parseTranslation(text: string, language: string): Translation {
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

        if (lines.length < 3) {
            throw new Error('Invalid translation format: insufficient lines');
        }

        // Validate headline is in caps
        if (lines[0] !== lines[0].toUpperCase()) {
            throw new Error('Invalid translation format: headline must be in uppercase');
        }

        const headline = lines[0];
        const location = lines[1];
        const body = lines.slice(2).join('\n');

        // Basic validation
        if (!headline || !location || !body) {
            throw new Error('Invalid translation format: missing required components');
        }

        return {
            language,
            headline,
            location,
            body,
            timestamp: new Date().toISOString()
        };
    }
} 