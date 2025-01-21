import { useReports } from '@/context/ReportsContext';
import { Copy, Trash2 } from 'react-feather';

export function ReportView() {
  const { currentReport: report, addReport, updateReport, deleteReport, setCurrentReport } = useReports();

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-400">No Report Selected</h2>
          <p className="mt-2 text-gray-500">Select a channel and generate a report to view it here</p>
        </div>
      </div>
    );
  }

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
    }
  };

  return (
    <div className="relative min-h-full bg-gray-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
        <div className="border-b border-gray-800 px-4 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">
                {report.summary.headline}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
                <span className="truncate max-w-[200px]">{report.channelName}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate max-w-[300px]">{report.summary.location_and_period}</span>
                <span className="hidden sm:inline">•</span>
                <span>{new Date(report.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const text = `${report.summary.headline}\n\n${report.summary.location_and_period}\n\n${report.summary.body}\n\n${report.summary.sources ? 'Sources:\n' + report.summary.sources.join('\n') : ''}`;
                  navigator.clipboard.writeText(text);
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Copy Report"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                title="Delete Report"
              >
                <Trash2 className="w-5 h-5" />
              </button>
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