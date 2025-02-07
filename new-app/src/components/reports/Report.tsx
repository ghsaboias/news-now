import { TimeframeBadge } from "../common/badges/TimeframeBadge";

import { useReports } from "@/context/ReportsContext";
import { useAppToast } from "@/hooks/useAppToast";
import { DiscordMessage } from "@/types/discord";
import { ReportContent, Report as ReportType } from "@/types/report";
import { SourceBlock as SourceBlockType } from "@/types/source";
import { Translation } from "@/types/translation";
import { formatReportDate } from "@/utils/date";
import { Book, Copy, Globe, Trash2 } from "lucide-react";
import { useState } from "react";
import { MessageCountBadge } from "../common/badges/MessageCountBadge";
import { Button } from "../ui/button";

const SUPPORTED_LANGUAGES = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'ar', name: 'Arabic' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'hi', name: 'Hindi' }
] as const;

// Add language name lookup
const LANGUAGE_NAMES: Record<string, string> = {
    'es': 'Spanish',
    'fr': 'French',
    'ar': 'Arabic',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'hi': 'Hindi'
};

function parseSourceBlocks(messages: DiscordMessage[]): SourceBlockType[] {
    console.log("[parseSourceBlocks] Input messages:", messages);
    const blocks: Record<string, SourceBlockType> = {};

    messages.forEach((msg) => {
        // Create unique key for the source block using raw message data
        const key = msg.content;
        if (!blocks[key]) {
            blocks[key] = {
                platform: '',
                handle: '',
                references: []
            };
        }

        // Format timestamp
        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        });

        // Process attachments
        const attachments = msg.attachments?.map(att => ({
            type: att.content_type?.startsWith('video/') ? 'video' as const : 'image' as const,
            url: att.url,
            width: att.width || 0,
            height: att.height || 0,
            filename: att.filename
        }));

        // Process embed information
        const embed = msg.embeds?.[0] ? {
            description: msg.embeds[0].description,
            title: msg.embeds[0].title,
            translatedFrom: msg.embeds[0].footer?.text?.includes('Translated from:')
                ? msg.embeds[0].footer.text.replace('Translated from:', '').trim()
                : undefined,
            thumbnail: msg.embeds[0].thumbnail ? {
                url: msg.embeds[0].thumbnail.url,
                width: msg.embeds[0].thumbnail.width || 0,
                height: msg.embeds[0].thumbnail.height || 0
            } : undefined
        } : undefined;

        // Process referenced message
        const referencedMessage = msg.referenced_message ? {
            content: msg.referenced_message.content,
            author: {
                username: msg.referenced_message.author.username,
                globalName: msg.referenced_message.author.global_name || undefined
            }
        } : undefined;

        // Add reference
        blocks[key].references.push({
            time,
            quote: msg.content || (msg.embeds?.[0]?.description || msg.embeds?.[0]?.title || 'No content'),
            url: msg.content || '',
            timestamp: msg.timestamp,
            author: {
                username: msg.author.username,
                avatar: msg.author.avatar,
                globalName: msg.author.global_name || undefined
            },
            attachments,
            embed,
            referencedMessage,
            status: msg.status || 'success'
        });
    });

    return Object.values(blocks);
}

// Subcomponents
const LanguageControls = ({
    selectedLanguage,
    onLanguageChange,
    report,
    isTranslating,
    handleTranslate
}: {
    selectedLanguage: string,
    onLanguageChange: (lang: string) => void,
    report: ReportType,
    isTranslating: boolean,
    handleTranslate: () => void
}) => (
    <div className="flex items-center gap-2">
        <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-gray-800 text-gray-100 rounded-md text-sm py-1 pl-2 pr-8 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="">Original</option>
            {SUPPORTED_LANGUAGES.map(lang => {
                const hasTranslation = report.summary.translations?.some(t => t.language === lang.code);
                return (
                    <option
                        key={lang.code}
                        value={lang.code}
                    >
                        {lang.name} {hasTranslation ? '(✓)' : ''}
                    </option>
                );
            })}
        </select>
        {selectedLanguage && !report.summary.translations?.some(t => t.language === selectedLanguage) && (
            <Button
                onClick={handleTranslate}
                disabled={isTranslating}
                variant="secondary"
                className="!py-1"
            >
                Translate
            </Button>
        )}
    </div>
);

const TranslationBanner = ({
    currentTranslation,
    onLanguageChange
}: {
    currentTranslation: Translation | null | undefined,
    onLanguageChange: (lang: string) => void
}) => currentTranslation ? (
    <div className="bg-blue-900/30 border-b border-blue-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Book size={16} className="text-blue-400" />
            <span className="text-sm text-blue-200">
                Viewing translation in {LANGUAGE_NAMES[currentTranslation.language]}
            </span>
        </div>
        <button
            onClick={() => onLanguageChange('')}
            className="text-sm text-blue-400 hover:text-blue-300"
        >
            View Original
        </button>
    </div>
) : null;

const ReportHeader = ({
    content,
    report,
    currentTranslation,
    selectedLanguage,
    onLanguageChange,
    isTranslating,
    handleTranslate,
    handleCopy,
    handleDelete
}: {
    content: ReportContent,
    report: ReportType,
    currentTranslation: Translation | null | undefined,
    selectedLanguage: string,
    onLanguageChange: (lang: string) => void,
    isTranslating: boolean,
    handleTranslate: () => void,
    handleCopy: () => void,
    handleDelete: () => void
}) => {
    const { full: date, time } = formatReportDate(report.timeframe.start);

    return (
        <div className="top-0 z-10 bg-gray-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-gray-900/75">
            <div className="border-b border-gray-800 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl font-semibold text-gray-50 leading-tight">
                            {content.headline}
                            {currentTranslation && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-900/50 text-blue-200 border border-blue-800/50">
                                    <Globe size={12} className="mr-1" />
                                    {LANGUAGE_NAMES[currentTranslation.language]}
                                </span>
                            )}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-400 leading-normal">
                            <span className="truncate max-w-[200px]">{report.channelName}</span>
                            <TimeframeBadge timeframe={report.timeframe.type} />
                            <MessageCountBadge count={report.messageCount} />
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate max-w-[300px]">{content.location}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{date}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{time}</span>
                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                                <LanguageControls
                                    selectedLanguage={selectedLanguage}
                                    onLanguageChange={onLanguageChange}
                                    report={report}
                                    isTranslating={isTranslating}
                                    handleTranslate={handleTranslate}
                                />
                                <button
                                    onClick={handleCopy}
                                    title="Copy Report"
                                    className="
                                    p-2 text-gray-400 rounded-lg 
                                    transition-colors duration-DEFAULT
                                    hover:text-gray-50 hover:bg-gray-700
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800
                                  "
                                >
                                    <Copy size={16} />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    title="Delete Report"
                                    className="
                                    p-2 text-gray-400 rounded-lg 
                                    transition-colors duration-DEFAULT
                                    hover:text-error-500 hover:bg-gray-700
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800
                                    "
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getMediaType = (att: DiscordMessage['attachments'][0]) => {
    // First try with content_type if available
    if (att.content_type?.startsWith('image/')) return 'image';
    if (att.content_type?.startsWith('video/')) return 'video';

    // Fallback to extension check
    const ext = att.filename.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (ext && ['mp4', 'webm', 'mov'].includes(ext)) return 'video';

    return null;
};

const extractUrls = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
};

const ImageWithFallback = ({ url, filename }: { url: string; filename: string }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div className="bg-red-900/20 p-4 rounded-md flex items-center justify-center">
                <span className="text-sm text-red-400">Failed to load image</span>
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={filename}
            className="rounded-md max-h-48 object-cover w-full"
            onError={() => setHasError(true)}
        />
    );
};

const SourceReference = ({ source, blockIndex, refIndex }: { source: any, blockIndex: number, refIndex: number }) => {
    console.log('SourceReference rendering:', {
        blockIndex,
        refIndex,
        attachments: source.attachments
    });

    const urls = source.url ? extractUrls(source.url) : [];

    return (
        <div key={`ref-${blockIndex}-${refIndex}`} className="mb-4">
            <div className="flex flex-col gap-2">
                {/* Header with timestamp and author info */}
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-300">[{source.time}]</span>
                </div>

                {/* Main content */}
                <div className="flex flex-col gap-2">
                    {/* Main quote with URLs */}
                    <div className="text-gray-100">
                        {urls.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-start gap-2">
                                    <span className="flex-grow">{source.quote}</span>
                                    {urls.length > 0 && (
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {urls.map((url, idx) => (
                                                <a
                                                    key={idx}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 hover:bg-blue-900/20 rounded-md group"
                                                    title={url}
                                                >
                                                    <Globe
                                                        size={14}
                                                        className="text-gray-400 group-hover:text-blue-400 transition-colors"
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {urls.length > 1 && (
                                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                                        {urls.map((url, idx) => (
                                            <a
                                                key={idx}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-blue-400 truncate max-w-[300px]"
                                            >
                                                {url}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span>{source.quote}</span>
                        )}
                    </div>

                    {/* Embed information */}
                    {source.embed && (
                        <div className="mt-1 text-sm">
                            {source.embed.title && (
                                <div className="font-medium text-gray-300">{source.embed.title}</div>
                            )}
                            {source.embed.description && (
                                <div className="text-gray-400 mt-1">{source.embed.description}</div>
                            )}
                            {source.embed.translatedFrom && (
                                <div className="text-xs text-gray-500 mt-1">
                                    Translated from {source.embed.translatedFrom}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attachments grid */}
                    {source.attachments && source.attachments.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {source.attachments.map((att: DiscordMessage['attachments'][0], index: number) => {
                                console.log('Processing attachment:', {
                                    url: att.url,
                                    type: att.content_type,
                                    filename: att.filename
                                });

                                const mediaType = getMediaType(att);

                                return (
                                    <div key={index} className="relative group">
                                        {mediaType === 'image' ? (
                                            <ImageWithFallback url={att.url} filename={att.filename} />
                                        ) : mediaType === 'video' ? (
                                            <video
                                                src={att.url}
                                                className="rounded-md max-h-48 object-cover w-full"
                                                controls
                                                onError={(e) => {
                                                    console.error(`Error loading video: ${att.url}`, e);
                                                    (e.target as HTMLVideoElement).style.display = 'none';
                                                    (e.target as HTMLVideoElement).parentElement?.classList.add(
                                                        'bg-red-900/20',
                                                        'p-4',
                                                        'rounded-md',
                                                        'flex',
                                                        'items-center',
                                                        'justify-center'
                                                    );
                                                    // Instead of innerHTML manipulation, consider showing a fallback UI here as well.
                                                }}
                                                onLoadedData={() => console.log(`Successfully loaded video: ${att.url}`)}
                                            />
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const SourceBlockComponent = ({ block, blockIndex }: { block: SourceBlockType, blockIndex: number }) => (
    <div key={`block-${blockIndex}`} className="mb-6 break-all">
        <div className="pl-4 border-l border-gray-800">
            {block.references.map((reference, refIndex) => (
                <SourceReference key={refIndex} source={reference} blockIndex={blockIndex} refIndex={refIndex} />
            ))}
        </div>
    </div>
);

export function Report({
    report,
    content,
    currentTranslation,
    selectedLanguage,
    onLanguageChange
}: {
    report: ReportType,
    content: ReportContent,
    currentTranslation?: Translation | null,
    selectedLanguage: string,
    onLanguageChange: (lang: string) => void
}) {
    const { deleteReport, setCurrentReport, updateReport } = useReports();
    const toast = useAppToast();
    const [isTranslating, setIsTranslating] = useState(false);

    const handleTranslate = async () => {
        if (!selectedLanguage || isTranslating || !report) return;

        setIsTranslating(true);
        try {
            console.log('Starting translation for:', selectedLanguage);

            const response = await fetch(`/api/reports/${report.id}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: selectedLanguage }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to translate report');
            }

            const { data: translation } = await response.json();
            console.log('Translation received:', translation);

            // Create new translations array
            const translations = [...(report.summary.translations || [])];
            const existingIndex = translations.findIndex(t => t.language === selectedLanguage);
            if (existingIndex >= 0) {
                translations[existingIndex] = translation;
            } else {
                translations.push(translation);
            }

            // Update the report with new translation
            const updatedReport = {
                ...report,
                summary: {
                    ...report.summary,
                    translations,
                },
            };

            // First update the report in context
            updateReport(updatedReport);

            // Then update in the database
            await fetch(`/api/reports/${report.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedReport),
            });

            // Keep the selected language to show the translation
            onLanguageChange(translation.language);

            toast.success('Translation completed - Now showing translated version');
        } catch (err) {
            console.error('Error translating report:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to translate report');
            onLanguageChange('');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleCopy = () => {
        const { full: date, time } = formatReportDate(report.timeframe.start);
        const text = `${report.summary.headline}\n\n${report.summary.location} • ${date} • ${time}\n\n${report.summary.body}\n\n${report.summary.raw_response ? 'Sources:\n' + report.summary.raw_response.split('\n').join('\n') : ''}`;
        navigator.clipboard.writeText(text);
        toast.success('Report copied to clipboard');
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this report?')) return;

        try {
            await deleteReport(report.id);
            setCurrentReport(null);
            toast.success('Report deleted successfully');
        } catch (err) {
            console.error('Error deleting report:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to delete report');
        }
    };

    return (
        <>
            <TranslationBanner
                currentTranslation={currentTranslation}
                onLanguageChange={onLanguageChange}
            />
            <ReportHeader
                content={content}
                report={report}
                currentTranslation={currentTranslation}
                selectedLanguage={selectedLanguage}
                onLanguageChange={onLanguageChange}
                isTranslating={isTranslating}
                handleTranslate={handleTranslate}
                handleCopy={handleCopy}
                handleDelete={handleDelete}
            />

            {/* Content */}
            <div className="p-4">
                <div className="max-w-none text-gray-100 prose-headings:text-gray-100 space-y-6 text-lg">
                    {content.body.split('\n').map((line, index) => (
                        <p key={`line-${index}`} className="whitespace-pre-line text-justify">
                            {line}
                        </p>
                    ))}

                    {/* Translation Info */}
                    {currentTranslation && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            <p className="text-sm text-gray-400">
                                Translated on {new Date(currentTranslation.timestamp).toLocaleString()}
                            </p>
                        </div>
                    )}

                    {/* Sources Section - Only show for original content */}
                    {report.messages && report.messages.length > 0 && !selectedLanguage && (
                        <div className="mt-8 pt-8 border-t border-gray-700">
                            <h3 className="text-lg font-semibold mb-4">
                                Sources ({report.messageCount} messages)
                            </h3>
                            <div>
                                {parseSourceBlocks(report.messages).map((block, blockIndex) => (
                                    <SourceBlockComponent key={blockIndex} block={block} blockIndex={blockIndex} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}