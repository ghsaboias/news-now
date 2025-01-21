import { ErrorMessage } from '@/components/common/ErrorMessage';
import { useReports } from '@/context/ReportsContext';
import { useToast } from '@/context/ToastContext';
import { useEffect } from 'react';
import { Copy, Edit2, Trash2 } from 'react-feather';
import { ReportSkeleton } from './ReportSkeleton';

export function RecentReports() {
  const {
    reports,
    loading,
    error,
    fetchReports,
    addReport,
    updateReport,
    deleteReport,
    setCurrentReport
  } = useReports();
  const { showToast } = useToast();

  // Fetch reports on mount
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
        <ReportSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
        <ErrorMessage message={error} onRetry={fetchReports} />
      </div>
    );
  }

  if (!reports.length) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
        <div className="flex items-center justify-center py-8 text-gray-400">
          No reports yet
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
      <div className="flex flex-col gap-2">
        {reports.map((group) => (
          <div key={group.date}>
            <div className="mb-2 text-sm font-medium text-gray-400">
              {new Date(group.date).toLocaleDateString()}
            </div>
            <div className="flex flex-col gap-2">
              {group.reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg bg-gray-800 p-4 hover:bg-gray-750 cursor-pointer"
                  onClick={() => setCurrentReport(report)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-white">
                      {report.summary.headline}
                    </div>
                    <div className="text-sm text-gray-400">
                      #{report.channelName} • {report.summary.location_and_period}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();  // Prevent card click when clicking button
                        const text = `${report.summary.headline}\n\n${report.summary.location_and_period}\n\n${report.summary.body}\n\n${report.summary.sources ? 'Sources:\n' + report.summary.sources.join('\n') : ''}`;
                        navigator.clipboard.writeText(text);
                        showToast('Report copied to clipboard');
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy Report"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();  // Prevent card click when clicking button
                        updateReport(report);
                      }}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit Report"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();  // Prevent card click when clicking button
                        deleteReport(report.id);
                        setCurrentReport(null);
                      }}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete Report"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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