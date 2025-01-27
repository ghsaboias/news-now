import { MessageCountBadge } from '@/components/common/badges/MessageCountBadge';
import { TimeframeBadge } from '@/components/common/badges/TimeframeBadge';
import { Button } from '@/components/common/Button';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useReports } from '@/context/ReportsContext';
import { useToast } from '@/context/ToastContext';
import { Report } from '@/types';
import { formatReportDate } from '@/utils/date';
import { Copy, Trash2 } from 'react-feather';

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
  const { deleteReport, setCurrentReport } = useReports();
  const { showToast } = useToast();

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

  const handleCopy = () => {
    const { full: date, time } = formatReportDate(report.timeframe.start);
    const text = `${report.summary.headline}\n\n${report.summary.location} • ${date} • ${time}\n\n${report.summary.body}\n\n${report.summary.sources ? 'Sources:\n' + report.summary.sources.join('\n') : ''}`;
    navigator.clipboard.writeText(text);
    showToast('Report copied to clipboard');
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
      showToast('Failed to delete report');
    }
  };

  const { full: date, time } = formatReportDate(report.timeframe.start);
  const sourceBlocks = report.summary.sources ? parseSourceBlocks(report.summary.sources) : [];

  return (
    <div className="relative min-h-full bg-gray-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md supports-[backdrop-filter]:bg-gray-900/75">
        <div className="border-b border-gray-800 px-4 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-medium text-gray-50 break-words leading-tight">
                {report.summary.headline}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-400 leading-normal">
                <span className="truncate max-w-[200px]">{report.channelName}</span>
                <TimeframeBadge timeframe={report.timeframe.type} className="ml-1" />
                <MessageCountBadge count={report.messageCount} />
                <span className="hidden sm:inline">•</span>
                <span className="truncate max-w-[300px]">{report.summary.location}</span>
                <span className="hidden sm:inline">•</span>
                <span>{date}</span>
                <span className="hidden sm:inline">•</span>
                <span>{time}</span>
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <Button
                    onClick={handleCopy}
                    variant="secondary"
                    icon={<Copy size={16} />}
                    title="Copy Report"
                    className="!p-0 bg-transparent hover:bg-transparent"
                  >
                    <span className="sr-only">Copy Report</span>
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="danger"
                    icon={<Trash2 size={16} />}
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
        <div className="max-w-none text-gray-100 prose-headings:text-gray-100 space-y-6">
          {report.summary.body.split('\n').map((line, index) => (
            <p key={`line-${index}`} className="whitespace-pre-line text-justify">
              {line}
            </p>
          ))}

          {/* Sources Section */}
          {sourceBlocks.length > 0 && (
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