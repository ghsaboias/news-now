'use client';

import { ReportDrawer } from '@/components/ReportDrawer';
import { AISummary, DiscordChannel, DiscordMessage, Report, ReportGroup } from '@/types';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Server Actions
async function fetchChannelsAction(): Promise<DiscordChannel[]> {
  const response = await fetch('/api/discord/channels');
  if (!response.ok) {
    throw new Error('Failed to fetch channels', { cause: response });
  }
  return response.json();
}

async function fetchMessagesAction(channelId: string, timeframe: string): Promise<DiscordMessage[]> {
  const response = await fetch(`/api/discord/messages?channelId=${channelId}&timeframe=${timeframe}`);
  if (!response.ok) {
    throw new Error('Failed to fetch messages', { cause: response });
  }
  return response.json();
}

async function generateSummaryAction(channelId: string, channelName: string, messages: DiscordMessage[]): Promise<AISummary> {
  const response = await fetch(`/api/discord/summary?channelId=${channelId}&channelName=${channelName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) {
    throw new Error('Failed to generate summary', { cause: response });
  }
  return response.json();
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export default function DiscordTest() {
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [reports, setReports] = useState<ReportGroup[]>([]);
  const [progress, setProgress] = useState<{
    batchCount: number;
    totalMessages: number;
    processing: boolean;
  }>({
    batchCount: 0,
    totalMessages: 0,
    processing: false
  });

  // Fetch channels and reports on component mount
  useEffect(() => {
    fetchChannels();
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      
      console.log('Fetched reports data:', data);
      
      if (!Array.isArray(data)) {
        console.error('Expected array of report groups, got:', typeof data);
        setReports([]);
        return;
      }

      // Validate the data structure
      const validReportGroups = data.filter((group): group is ReportGroup => {
        if (!group || typeof group !== 'object') return false;
        if (!('date' in group) || !('reports' in group)) return false;
        if (!Array.isArray(group.reports)) return false;
        
        // Validate each report in the group
        return group.reports.every((report: unknown) => 
          report &&
          typeof report === 'object' &&
          report !== null &&
          'id' in report &&
          'channelId' in report &&
          'channelName' in report &&
          'timestamp' in report &&
          'timeframe' in report &&
          'messageCount' in report &&
          'summary' in report
        );
      });

      setReports(validReportGroups);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setReports([]);
    }
  };

  const fetchChannels = async () => {
    setLoading(true);
    setError('');
    try {
      const fetchedChannels = await fetchChannelsAction();
      setChannels(fetchedChannels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channels');
    } finally {
      setLoading(false);
    }
  };

  const handleChannelSelect = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      setSelectedChannelId(channelId);
      setSelectedChannel(channel.name);
      setSummary(null);
      setMessages([]);
      setProgress({ batchCount: 0, totalMessages: 0, processing: false });
    }
  };

  const handleCreateReport = async () => {
    if (!selectedChannelId || !selectedChannel) return;
    
    setLoading(true);
    setError('');
    setProgress({ batchCount: 0, totalMessages: 0, processing: true });
    setSummary(null);
    
    try {
      // Set up SSE for message updates
      const eventSource = new EventSource(
        `/api/discord/messages?channelId=${selectedChannelId}&timeframe=${selectedTimeframe}`
      );

      let finalMessages: DiscordMessage[] = [];

      eventSource.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'batch':
            setProgress(prev => ({
              ...prev,
              batchCount: data.batchCount,
              totalMessages: data.totalMessages
            }));
            break;
          
          case 'complete':
            finalMessages = data.messages;
            setMessages(data.messages);
            setProgress(prev => ({
              ...prev,
              processing: false,
              totalMessages: data.totalMessages
            }));
            eventSource.close();

            // Only generate summary after we have all messages
            if (finalMessages.length > 0) {
              const newSummary = await generateSummaryAction(selectedChannelId, selectedChannel, finalMessages);
              setSummary(newSummary);

              // Create and save the report
              const report: Report = {
                id: uuidv4(),
                channelId: selectedChannelId,
                channelName: selectedChannel,
                timestamp: new Date().toISOString(),
                timeframe: {
                  type: selectedTimeframe as '1h' | '4h' | '24h',
                  start: new Date(Date.now() - getTimeframeMs(selectedTimeframe)).toISOString(),
                  end: new Date().toISOString(),
                },
                messageCount: finalMessages.length,
                summary: newSummary,
              };

              await saveReport(report);
              await fetchReports(); // Refresh the reports list
            }
            break;
          
          case 'error':
            eventSource.close();
            throw new Error(data.error);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        throw new Error('Failed to connect to message stream');
      };
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const getTimeframeMs = (timeframe: string): number => {
    switch (timeframe) {
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  };

  const saveReport = async (report: Report) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      if (!response.ok) throw new Error('Failed to save report');
    } catch (err) {
      console.error('Error saving report:', err);
      setError('Failed to save report');
    }
  };

  const handleEditReport = async (report: Report) => {
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      if (!response.ok) throw new Error('Failed to update report');
      await fetchReports();
    } catch (err) {
      console.error('Error updating report:', err);
      setError('Failed to update report');
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete report');
      await fetchReports();
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('Failed to delete report');
    }
  };

  const timeframeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '4h', label: 'Last 4 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">News Now</h1>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            View Saved Reports
          </button>
          {error && (
            <div className="mt-4 text-red-500 p-4 bg-red-900/20 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}
        </header>

        {/* Controls Section */}
        <div className="mb-8 space-y-4 max-w-2xl mx-auto">
          {/* Channel Dropdown */}
          <div className="relative">
            <select
              value={selectedChannelId}
              onChange={(e) => handleChannelSelect(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white 
                        appearance-none cursor-pointer hover:bg-gray-750 focus:ring-2 focus:ring-blue-500 
                        focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {timeframeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedTimeframe(option.value)}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors
                          ${selectedTimeframe === option.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-750'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Create Report Button */}
          <button
            onClick={handleCreateReport}
            disabled={loading || !selectedChannelId}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                     hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                     focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'Create Report'
            )}
          </button>
        </div>

        {/* Content Section */}
        {selectedChannel && (
          <div className="space-y-8">
            {/* Message Stats */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <div>
                    <span className="font-medium">Messages found: </span>
                    <span className="text-white">{progress.totalMessages}</span>
                  </div>
                  {progress.processing && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="w-3 h-3 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <span>Processing batch {progress.batchCount + 1}...</span>
                  </div>
                )}
                  <div>
                    <span className="font-medium">Timeframe: </span>
                    <span className="text-white">{timeframeOptions.find(opt => opt.value === selectedTimeframe)?.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Section */}
            {summary && (
              <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
                <h2 className="text-3xl font-bold text-white mb-4">{summary.headline}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
                  <span className="font-semibold">{summary.location_and_period}</span>
                </div>
                <div className="prose prose-lg max-w-none text-gray-300 prose-headings:text-gray-100">
                  {summary.body.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <ReportDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          reports={reports}
          onEditReport={handleEditReport}
          onDeleteReport={handleDeleteReport}
        />
      </div>
    </div>
  );
} 