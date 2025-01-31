import { MessageCountBadge } from '@/components/common/badges/MessageCountBadge';
import { TimeframeBadge } from '@/components/common/badges/TimeframeBadge';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { useReports } from '@/context/ReportsContext';
import { useAppToast } from '@/hooks/useAppToast';
import { Report } from '@/types';
import { formatReportDate } from '@/utils/date';
import { useEffect, useMemo, useState } from 'react';
import { Book, Globe } from 'react-feather';

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' }
] as const;

interface ReportViewProps {
  report?: Report | null;
}

interface SourceBlock {
  platform: string;
  handle: string;
  references: {
    number: string;
    time: string;
    quote: string;
    original: string;
    link?: string;
  }[];
}

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

function parseSourceBlocks(sources: string[]): SourceBlock[] {
  const blocks: SourceBlock[] = [];
  let currentBlock: SourceBlock | null = null;

  for (const source of sources) {
    const lines = source.split('\n');

    // Check if this is a platform header line
    const platformMatch = lines[0].match(/^\[(\w+)\] @(\w+)/);
    if (platformMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        platform: platformMatch[1],
        handle: platformMatch[2],
        references: []
      };

      // Process the reference that follows
      const referenceMatch = lines[1]?.match(/^([¹²³⁴⁵⁶⁷⁸⁹])\[(\d{2}:\d{2})\] (.+)/);
      if (referenceMatch) {
        const [_, number, time, quote] = referenceMatch;
        const original = lines.find(l => l.startsWith('  Original:'))?.replace('  Original:', '').trim() || '';
        const link = lines.find(l => l.startsWith('  Link:'))?.replace('  Link:', '').trim();

        currentBlock.references.push({
          number,
          time,
          quote,
          original,
          link
        });
      }
    }
    // If it starts with a superscript, it's a reference in the current block
    else if (currentBlock && lines[0].match(/^[¹²³⁴⁵⁶⁷⁸⁹]\[/)) {
      const referenceMatch = lines[0].match(/^([¹²³⁴⁵⁶⁷⁸⁹])\[(\d{2}:\d{2})\] (.+)/);
      if (referenceMatch) {
        const [_, number, time, quote] = referenceMatch;
        const original = lines.find(l => l.startsWith('  Original:'))?.replace('  Original:', '').trim() || '';
        const link = lines.find(l => l.startsWith('  Link:'))?.replace('  Link:', '').trim();

        currentBlock.references.push({
          number,
          time,
          quote,
          original,
          link
        });
      }
    }
  }

  // Add the last block
  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function ReportViewContent({ report }: ReportViewProps) {
  const { deleteReport, setCurrentReport, updateReport } = useReports();
  const toast = useAppToast();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Get current content based on selected language and force update
  const currentTranslation = useMemo(() => {
    if (!report?.summary?.translations) return null;
    if (!selectedLanguage) return null;
    return report.summary.translations.find(t => t.language === selectedLanguage);
  }, [selectedLanguage, report?.summary?.translations]);

  const content = currentTranslation || report?.summary || {
    headline: '',
    body: '',
    location: '',
    sources: []
  };

  // Force content update when translations change
  useEffect(() => {
    if (report?.summary?.translations) {
      setForceUpdate(prev => prev + 1);
    }
  }, [report?.summary?.translations]);

  // Update selected language when translations change
  useEffect(() => {
    if (selectedLanguage && currentTranslation) {
      console.log('Translation available for:', selectedLanguage);
    }
  }, [selectedLanguage, currentTranslation]);

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-medium text-gray-400 leading-snug">No Report Selected</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-500 leading-normal">Select a channel and generate a report to view it here</p>
        </div>
      </div>
    );
  }

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
      setSelectedLanguage(translation.language);

      toast.success('Translation completed - Now showing translated version');
    } catch (err) {
      console.error('Error translating report:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to translate report');
      setSelectedLanguage('');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    const { full: date, time } = formatReportDate(report.timeframe.start);
    const text = `${report.summary.headline}\n\n${report.summary.location} • ${date} • ${time}\n\n${report.summary.body}\n\n${report.summary.sources ? 'Sources:\n' + report.summary.sources.join('\n') : ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Report copied to clipboard');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete report');

      deleteReport(report.id);
      setCurrentReport(null);
    } catch (err) {
      console.error('Error deleting report:', err);
      toast.error('Failed to delete report');
    }
  };

  const { full: date, time } = formatReportDate(report.timeframe.start);
  const sourceBlocks = report.summary.translations?.find(t => t.language === selectedLanguage)
    ? []  // Don't show source blocks for translations
    : (report.summary.sources ? parseSourceBlocks(report.summary.sources) : []);

  // Language selection UI
  const renderLanguageControls = () => (
    <div className="flex items-center gap-2">
      <select
        value={selectedLanguage}
        onChange={(e) => setSelectedLanguage(e.target.value)}
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

  return (
    <div className="relative min-h-full bg-gray-900">
      {/* Translation Banner */}
      {currentTranslation && (
        <div className="bg-blue-900/30 border-b border-blue-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book size={16} className="text-blue-400" />
            <span className="text-sm text-blue-200">
              Viewing translation in {LANGUAGE_NAMES[currentTranslation.language]}
            </span>
          </div>
          <button
            onClick={() => setSelectedLanguage('')}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View Original
          </button>
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-gray-900/75">
        <div className="border-b border-gray-800 p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl sm:text-3xl md:text-3xl font-medium text-gray-50 leading-tight text-justify">
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
                <TimeframeBadge timeframe={report.timeframe.type} className="ml-1" />
                <MessageCountBadge count={report.messageCount} />
                <span className="hidden sm:inline">•</span>
                <span className="truncate max-w-[300px]">{content.location}</span>
                <span className="hidden sm:inline">•</span>
                <span>{date}</span>
                <span className="hidden sm:inline">•</span>
                <span>{time}</span>
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  {renderLanguageControls()}
                  <Button
                    onClick={handleCopy}
                    variant="secondary"
                    title="Copy Report"
                    className="!p-0 bg-transparent hover:bg-transparent"
                  >
                    <span className="sr-only">Copy Report</span>
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="destructive"
                    title="Delete Report"
                    className="!p-0 bg-transparent hover:bg-transparent"
                  >
                    <span className="sr-only">Delete Report</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
          {sourceBlocks.length > 0 && !selectedLanguage && (
            <div className="mt-8 pt-8 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-4">
                Sources ({report.messageCount} messages)
              </h3>
              <div className="space-y-6">
                {sourceBlocks.map((block, blockIndex) => (
                  <div key={`block-${blockIndex}`} className="space-y-3">
                    <a
                      href={`https://${block.platform === 'Telegram' ? `t.me/${block.handle}` : `twitter.com/${block.handle}`}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-gray-100 group transition-colors"
                    >
                      <span className="px-2 py-1 rounded bg-gray-800 group-hover:bg-gray-700">[{block.platform}]</span>
                      <span className="group-hover:underline">@{block.handle}</span>
                    </a>
                    <div className="space-y-4 pl-4 border-l border-gray-800">
                      {block.references.map((ref, refIndex) => (
                        <div key={`ref-${blockIndex}-${refIndex}`} className="space-y-2">
                          <div className="flex items-baseline gap-2 text-sm">
                            <span className="text-gray-300">{ref.number}[{ref.time}]</span>
                            <span className="text-gray-100">{ref.quote}</span>
                          </div>
                          {ref.original && (
                            <div className="text-sm text-gray-400 pl-8">
                              <span className="font-medium text-gray-500">Original: </span>
                              {ref.original}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportView(props: ReportViewProps) {
  return (
    <ErrorBoundary>
      <ReportViewContent {...props} />
    </ErrorBoundary>
  );
} 