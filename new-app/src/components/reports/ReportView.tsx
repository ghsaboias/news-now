import { MessageCountBadge } from '@/components/common/badges/MessageCountBadge';
import { TimeframeBadge } from '@/components/common/badges/TimeframeBadge';
import { Button } from '@/components/common/Button';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useReports } from '@/context/ReportsContext';
import { useToast } from '@/context/ToastContext';
import { Report } from '@/types';
import { formatTimestamp } from '@/utils/date';
import { Copy, Trash2 } from 'react-feather';

interface ReportViewProps {
  report?: Report | null;
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
    const text = `${report.summary.headline}\n\n${report.summary.location_and_period}\n\n${report.summary.body}\n\n${report.summary.sources ? 'Sources:\n' + report.summary.sources.join('\n') : ''}`;
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
                <span className="truncate max-w-[300px]">{report.summary.location_and_period}</span>
                <span className="hidden sm:inline">•</span>
                <span>{formatTimestamp(report.timestamp)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleCopy}
                variant="secondary"
                icon={<Copy />}
                title="Copy Report"
                className="!p-2"
              >
                <span className="sr-only">Copy Report</span>
              </Button>
              <Button
                onClick={handleDelete}
                variant="danger"
                icon={<Trash2 />}
                title="Delete Report"
                className="!p-2"
              >
                <span className="sr-only">Delete Report</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 lg:p-8">
        <div className="max-w-none text-gray-100 prose-headings:text-gray-100 space-y-6">
          {report.summary.body.split('\n').map((line, index) => (
            <p key={`line-${index}`} className="whitespace-pre-line text-justify">
              {line}
            </p>
          ))}
          
          {/* Sources Section */}
          {report.summary.sources && report.summary.sources.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Sources</h3>
              <div className="space-y-2 text-sm text-gray-400">
                {report.summary.sources.map((source, index) => (
                  <p key={`source-${index}`} className="whitespace-pre-line">
                    {source}
                  </p>
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