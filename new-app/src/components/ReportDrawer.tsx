'use client';

import { Report, ReportGroup } from '@/types';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Edit2, Trash2, X } from 'react-feather';

interface ReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ReportGroup[];
  onEditReport: (report: Report) => void;
  onDeleteReport: (report: Report) => void;
}

export function ReportDrawer({ isOpen, onClose, reports, onEditReport, onDeleteReport }: ReportDrawerProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const handleCopyReport = async (report: Report) => {
    const text = `${report.summary.headline}\n\n${report.summary.location_and_period}\n\n${report.summary.body}`;
    await navigator.clipboard.writeText(text);
    setCopyFeedback(report.id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeframe = (type: '1h' | '4h' | '24h') => {
    switch (type) {
      case '1h': return 'Last Hour';
      case '4h': return 'Last 4 Hours';
      case '24h': return 'Last 24 Hours';
    }
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white">Saved Reports</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Report List */}
      <div className="overflow-y-auto h-[calc(100vh-4rem)]">
        {reports.map((group) => (
          <div key={group.date} className="border-b border-gray-700">
            <button
              onClick={() => toggleDate(group.date)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
            >
              <span className="text-white font-medium">{formatDate(group.date)}</span>
              {expandedDates.has(group.date) ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedDates.has(group.date) && (
              <div className="pb-2">
                {group.reports.map((report) => (
                  <div
                    key={report.id}
                    className="mx-2 my-1 p-3 rounded-lg bg-gray-750 hover:bg-gray-700 transition-colors"
                  >
                    <div className="mb-2">
                      <h3 className="text-white font-medium">{report.channelName}</h3>
                      <p className="text-sm text-gray-400">
                        {formatTimeframe(report.timeframe.type)} • {
                          new Date(report.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        }
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditReport(report)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                        title="Edit Report"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCopyReport(report)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                        title="Copy Report"
                      >
                        {copyFeedback === report.id ? (
                          <span className="text-green-400 text-sm">Copied!</span>
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteReport(report)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                        title="Delete Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 