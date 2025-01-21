import { useReports } from '@/context/ReportsContext';
import { Report } from '@/types';
import { Copy, Edit2, Trash2 } from 'react-feather';

interface ReportViewProps {
  report: Report;
}

export function ReportView({ report }: ReportViewProps) {
  const { addReport, updateReport, deleteReport, setCurrentReport } = useReports();

  const handleDelete = () => {
    deleteReport(report.id);
    setCurrentReport(null);
  };

  return (
    <div className="relative min-h-full bg-gray-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
        <div className="border-b border-gray-800 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {report.summary.headline}
              </h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                <span>#{report.channelName}</span>
                <span>•</span>
                <span>{report.summary.location_and_period}</span>
                <span>•</span>
                <span>{new Date(report.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                onClick={() => updateReport(report)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Edit Report"
              >
                <Edit2 className="w-5 h-5" />
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
      <div className="p-8">
        <div className="max-w-none text-gray-100 prose-headings:text-gray-100 space-y-6">
          {report.summary.body.split('\n').map((line, index) => (
            <p key={`line-${index}`} className="whitespace-pre-line">
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