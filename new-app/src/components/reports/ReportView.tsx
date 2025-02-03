import { MessageCountBadge } from '@/components/common/badges/MessageCountBadge';
import { TimeframeBadge } from '@/components/common/badges/TimeframeBadge';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { useReports } from '@/context/ReportsContext';
import { useAppToast } from '@/hooks/useAppToast';
import { Report } from '@/types/report';
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

interface SourceBlock {
  url: string;
  platform: 'X' | 'Telegram';
  handle: string;
  references: {
    number: string;
    time: string;
    quote: string;
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
  console.log("[parseSourceBlocks] Input sources:", sources);
  const blocks: SourceBlock[] = [];
  let currentBlock: SourceBlock | null = null;

  for (const source of sources) {
    const lines = source.split('\n');
    console.log('[parseSourceBlocks] Processing source:', {
      source,
      lines
    });

    // First line should be the platform and handle
    const platformMatch = lines[0].match(/^\[(\w+)\]\s*@(\w+)/);
    if (platformMatch) {
      const [_, platform, handle] = platformMatch;
      console.log('[parseSourceBlocks] Found platform match:', { platform, handle });

      // Start a new block
      if (currentBlock) {
        blocks.push(currentBlock);
      }

      // Find the URL in the Original line
      const originalLine = lines.find(l => l.trim().startsWith('Original:'))?.trim();
      const url = originalLine?.replace('Original:', '').trim() || '';
      console.log('[parseSourceBlocks] Found URL:', { originalLine, url });

      currentBlock = {
        url,
        platform: platform === 'X' || platform === 'Twitter' ? 'X' : 'Telegram',
        handle,
        references: []
      };

      // Process all lines after the header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for reference line (starts with superscript)
        const referenceMatch = line.match(/^([¹²³⁴⁵⁶⁷⁸⁹])\[(\d{2}:\d{2})\]\s*"(.+)"/);
        if (referenceMatch) {
          const [_, number, time, quote] = referenceMatch;
          console.log('[parseSourceBlocks] Found reference:', { number, time, quote });
          currentBlock.references.push({
            number,
            time,
            quote: quote.trim()
          });
        }
      }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  console.log('[parseSourceBlocks] Final blocks:', blocks);
  return blocks;
}

function ReportViewContent({ report }: { report: Report }) {
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
                <TimeframeBadge timeframe={report.timeframe.type} />
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
          {report.summary.sources.length > 0 && !selectedLanguage && (
            <div className="mt-8 pt-8 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-4">
                Sources ({report.messageCount} messages)
              </h3>
              <div className="space-y-6">
                {parseSourceBlocks(report.summary.sources).map((block, blockIndex) => {
                  console.log('[Rendering source block]', block);
                  return (
                    <div key={`block-${blockIndex}`} className="space-y-3">
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-300">
                        <span className="px-2 py-1 rounded bg-gray-800">[{block.platform === 'X' ? 'Twitter' : 'Telegram'}]</span>
                        <a
                          href={block.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 hover:underline"
                        >
                          @{block.handle}
                        </a>
                      </div>
                      <div className="space-y-4 pl-4 border-l border-gray-800">
                        {block.references.map((ref, refIndex) => (
                          <div key={`ref-${blockIndex}-${refIndex}`} className="space-y-2">
                            <div className="flex items-baseline gap-2 text-sm">
                              <span className="text-gray-300">{ref.number}[{ref.time}]</span>
                              <a
                                href={block.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-100 hover:text-blue-400 hover:underline"
                              >
                                {ref.quote}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReportView({ report }: { report: Report | null }) {
  if (!report) return null;
  return (
    <ErrorBoundary>
      <ReportViewContent report={report} />
    </ErrorBoundary>
  );
} 