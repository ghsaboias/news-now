import { ErrorMessage } from '@/components/common/ErrorMessage';
import { MessageCountBadge } from '@/components/common/MessageCountBadge';
import { TimeframeBadge } from '@/components/common/TimeframeBadge';
import { useReports } from '@/context/ReportsContext';
import { useToast } from '@/context/ToastContext';
import { useEffect } from 'react';
import { Copy, Trash2, X } from 'react-feather';
import { ReportSkeleton } from './ReportSkeleton';

export function RecentReports() {
  const {
    reports,
    loading,
    error,
    fetchReports,
    deleteReport,
    setCurrentReport
  } = useReports();
  const { showToast } = useToast();

  const handleClearDate = async (date: string, reportsInGroup: number) => {
    if (!confirm(`Are you sure you want to delete all ${reportsInGroup} reports from ${new Date(date).toLocaleDateString()}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/reports/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });

      if (!response.ok) throw new Error('Failed to delete reports');

      // Clear current report if it's from this date
      const currentReport = reports.find(group => group.date === date)?.reports[0];
      if (currentReport) {
        setCurrentReport(null);
      }

      await fetchReports();
      showToast('Reports cleared successfully');
    } catch (err) {
      console.error('Error clearing reports:', err);
      showToast('Failed to clear reports');
    }
  };

  // Fetch reports on mount
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <ReportSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorMessage message={error} onRetry={fetchReports} />
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center py-8 text-gray-400">
          No reports yet
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {reports.map((group) => (
          <div key={group.date}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium text-gray-400">
                {new Date(group.date).toLocaleDateString()}
              </div>
              <button
                onClick={() => handleClearDate(group.date, group.reports.length)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                title="Clear all reports from this date"
              >
                <X className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {group.reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setCurrentReport(report)}
                  className="
                    group flex flex-col gap-3 p-4 rounded-lg
                    bg-gray-800/50 hover:bg-gray-800 
                    cursor-pointer transition-all
                    border border-gray-700/50 hover:border-gray-700
                    backdrop-blur-sm
                  "
                >
                  {/* Header with Headline and Actions */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded bg-gray-700/50 px-2 py-1 text-xs font-medium text-gray-300">
                      {report.channelName}
                    </span>
                    <TimeframeBadge timeframe={report.timeframe.type} />
                    <MessageCountBadge count={report.messageCount} />
                  </div>
                  <div className="flex items-start gap-2">
                    <h3 className="text-base sm:text-lg font-medium text-white leading-tight group-hover:text-blue-400 transition-colors text-left">
                      {report.summary.headline}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const text = `${report.summary.headline}\n\n${report.summary.location_and_period}\n\n${report.summary.body}\n\n${report.summary.sources ? 'Sources:\n' + report.summary.sources.join('\n') : ''}`;
                          navigator.clipboard.writeText(text);
                          showToast('Report copied to clipboard');
                        }}
                        className="
                          p-2 text-gray-400 rounded-lg transition-all
                          hover:text-white hover:bg-gray-700
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800
                        "
                        title="Copy Report"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
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
                        }}
                        className="
                          p-2 text-gray-400 rounded-lg transition-all
                          hover:text-red-400 hover:bg-gray-700
                          focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800
                        "
                        title="Delete Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
                    <span>{report.summary.location_and_period}</span>
                    <span>•</span>
                    <span>{new Date(report.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {/* Preview */}
                  <div className="text-sm text-gray-400 line-clamp-2">
                    {report.summary.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 