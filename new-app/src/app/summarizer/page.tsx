'use client';

import { ChannelSelect } from '@/components/controls/ChannelSelect';
import { GenerateButton } from '@/components/controls/GenerateButton';
import { TimeSelect, TimeframeOption } from '@/components/controls/TimeSelect';
import { SplitView } from '@/components/layout/SplitView';
import { RecentReports } from '@/components/reports/RecentReports';
import { ReportView } from '@/components/reports/ReportView';
import { ReportsProvider, useReports } from '@/context/ReportsContext';
import type { AISummary, DiscordChannel, DiscordMessage, Report } from '@/types';
import Link from 'next/link';
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
  return (
    <ReportsProvider>
      <DiscordTestContent />
    </ReportsProvider>
  );
}

function DiscordTestContent() {
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption['value']>('1h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [progress, setProgress] = useState<{
    batchCount: number;
    totalMessages: number;
    processing: boolean;
  }>({
    batchCount: 0,
    totalMessages: 0,
    processing: false
  });

  const { currentReport, setCurrentReport, fetchReports } = useReports();

  // Fetch channels and reports on component mount
  useEffect(() => {
    fetchChannels();
    fetchReports();
  }, [fetchReports]);

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
            setProgress((prev: { batchCount: number; totalMessages: number; processing: boolean; }) => ({
              ...prev,
              batchCount: data.batchCount,
              totalMessages: data.totalMessages
            }));
            break;
          
          case 'complete':
            finalMessages = data.messages;
            setMessages(data.messages);
            setProgress((prev: { batchCount: number; totalMessages: number; processing: boolean; }) => ({
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
              await fetchReports(); // Refresh the reports list in context
              setCurrentReport(report); // Select the newly created report
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

  const handleCopyReport = async (report: Report) => {
    const text = `${report.summary.headline}\n\n${report.summary.location_and_period}\n\n${report.summary.body}\n\n${report.summary.sources ? 'Sources:\n' + report.summary.sources.join('\n') : ''}`;
    await navigator.clipboard.writeText(text);
  };

  const timeframeOptions: TimeframeOption[] = [
    { value: '1h', label: 'Last Hour' },
    { value: '4h', label: 'Last 4 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
  ];

  const sidebarContent = (
    <div className="p-4 space-y-4">
      <Link href="/"> 
        <h1 className="text-2xl font-bold text-white">News Now</h1>
      </Link>
      
      <ChannelSelect
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelect={handleChannelSelect}
        disabled={loading}
      />

      <TimeSelect
        options={timeframeOptions}
        value={selectedTimeframe}
        onChange={setSelectedTimeframe}
        disabled={loading}
      />

      <GenerateButton
        onClick={handleCreateReport}
        disabled={!selectedChannelId}
        loading={loading}
      />

      {error && (
        <div className="text-red-500 p-4 bg-red-900/20 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      {/* Message Stats */}
      {selectedChannel && (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-gray-400">
              <div>
                <span className="font-medium">Messages: </span>
                <span className="text-white">{progress.totalMessages}</span>
              </div>
              {progress.processing && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-3 h-3 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <span>Batch {progress.batchCount + 1}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <RecentReports />
    </div>
  );

  const mainContent = (
    <div className="h-full">
      {currentReport ? (
        <ReportView report={currentReport} />
      ) : summary && (
        <ReportView
          report={{
            id: 'draft',
            channelId: selectedChannelId,
            channelName: selectedChannel,
            timestamp: new Date().toISOString(),
            timeframe: {
              type: selectedTimeframe,
              start: new Date(Date.now() - getTimeframeMs(selectedTimeframe)).toISOString(),
              end: new Date().toISOString(),
            },
            messageCount: messages.length,
            summary: {
              ...summary,
              timestamp: new Date().toISOString()
            }
          }}
        />
      )}
    </div>
  );

  return (
    <SplitView
      sidebarContent={sidebarContent}
      mainContent={mainContent}
    />
  );
} 