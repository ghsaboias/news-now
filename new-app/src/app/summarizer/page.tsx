'use client';

import { BulkGenerateButton } from '@/components/controls/BulkGenerateButton';
import { ChannelSelect } from '@/components/controls/ChannelSelect';
import { ControlsContainer } from '@/components/controls/ControlsContainer';
import { TimeSelect, TimeframeOption } from '@/components/controls/TimeSelect';
import { SplitView } from '@/components/layout/SplitView';
import { RecentReports } from '@/components/reports/RecentReports';
import { ReportView } from '@/components/reports/ReportView';
import { ReportsProvider, useReports } from '@/context/ReportsContext';
import type { AISummary, DiscordChannel, DiscordMessage } from '@/types';
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

async function fetchMessagesAction(
    channelId: string,
    channelName: string,
    timeframe: string,
    onProgress?: (messageCount: number) => void
): Promise<DiscordMessage[]> {
    const response = await fetch(`/api/discord/messages?channelId=${channelId}&channelName=${encodeURIComponent(channelName)}&timeframe=${timeframe}`);
    if (!response.ok) {
        throw new Error('Failed to fetch messages', { cause: response });
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let messages: DiscordMessage[] = [];
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                
                try {
                    const data = JSON.parse(line.replace('data: ', ''));
                    
                    if (data.type === 'batch') {
                        onProgress?.(data.botMessages);
                    } else if (data.type === 'complete') {
                        messages = data.messages;
                        return messages;
                    } else if (data.type === 'error') {
                        throw new Error(data.error || 'Failed to fetch messages');
                    }
                } catch (parseError) {
                    console.warn('Failed to parse SSE message:', parseError);
                    continue;
                }
            }
        }

        if (buffer.trim() && buffer.startsWith('data: ')) {
            try {
                const data = JSON.parse(buffer.replace('data: ', ''));
                if (data.type === 'complete') {
                    messages = data.messages;
                }
            } catch (parseError) {
                console.warn('Failed to parse final SSE message:', parseError);
            }
        }
    } finally {
        reader.releaseLock();
    }

    return messages;
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

function SummarizerContent() {
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState('');
    const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '24h'>('1h');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<{ step: string; percent?: number; messageCount?: number } | null>(null);
    const { setCurrentReport, fetchReports, currentReport } = useReports();

    const timeframeOptions: TimeframeOption[] = [
        { value: '1h', label: 'Last Hour' },
        { value: '4h', label: 'Last 4 Hours' },
        { value: '24h', label: 'Last 24 Hours' },
    ];

    useEffect(() => {
        fetchChannelsAction().then(setChannels).catch(console.error);
    }, []);

    const handleGenerateReport = async () => {
        if (!selectedChannelId) return;

        const channel = channels.find(c => c.id === selectedChannelId);
        if (!channel) return;

        setLoading(true);
        setProgress({ step: 'Fetching messages', percent: 0, messageCount: 0 });
        try {
            let currentMessageCount = 0;
            const messages = await fetchMessagesAction(
                selectedChannelId,
                channel.name,
                selectedTimeframe,
                (batchCount: number) => {
                    currentMessageCount += batchCount;
                    setProgress(prev => ({
                        ...prev!,
                        step: 'Fetching messages',
                        messageCount: currentMessageCount,
                        percent: Math.min(45, Math.round((currentMessageCount / 50) * 45)),
                    }));
                }
            );
            
            if (messages.length === 0) {
                console.log('No messages found');
                setProgress({ step: 'No messages found in the selected timeframe', percent: 100 });
                return;
            }

            setProgress(prev => ({
                ...prev!,
                step: 'Generating summary',
                percent: 50,
                messageCount: messages.length
            }));
            
            const summary = await generateSummaryAction(selectedChannelId, channel.name, messages);
            
            setProgress(prev => ({
                ...prev!,
                step: 'Saving report',
                percent: 90,
                messageCount: messages.length
            }));

            const report = {
                id: uuidv4(),
                channelId: selectedChannelId,
                channelName: channel.name,
                timestamp: new Date().toISOString(),
                timeframe: {
                    type: selectedTimeframe,
                    start: messages[0].timestamp,
                    end: messages[messages.length - 1].timestamp,
                },
                messageCount: messages.length,
                summary,
            };

            // Save the report to storage
            await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(report),
            });

            setCurrentReport(report);
            await fetchReports();
            setProgress(prev => ({
                ...prev!,
                step: 'Complete',
                percent: 100,
                messageCount: messages.length
            }));
        } catch (error) {
            console.error('Error generating report:', error);
            setProgress({ step: 'Error generating report', percent: 100 });
        } finally {
            setLoading(false);
            setTimeout(() => setProgress(null), 2000);
        }
    };

    return (
        <SplitView
            sidebarContent={
                <ControlsContainer>
                    <ChannelSelect
                        channels={channels}
                        selectedChannelId={selectedChannelId}
                        onSelect={setSelectedChannelId}
                        disabled={loading}
                    />
                    
                    <TimeSelect
                        value={selectedTimeframe}
                        onChange={setSelectedTimeframe}
                        options={timeframeOptions}
                        disabled={loading}
                    />

                    <div className="space-y-2">
                        <button
                            onClick={handleGenerateReport}
                            disabled={!selectedChannelId || loading}
                            className="
                                w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium
                                transition-all hover:bg-blue-700
                                disabled:opacity-50 disabled:cursor-not-allowed
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                            "
                        >
                            {loading ? 'Generating...' : 'Create Report'}
                        </button>
                        {progress && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>
                                        {progress.step}
                                        {progress.messageCount ? ` (${progress.messageCount} messages)` : ''}
                                    </span>
                                </div>
                                {progress.percent !== undefined && (
                                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-600 transition-all duration-500 ease-out"
                                            style={{ width: `${Math.round(progress.percent)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <BulkGenerateButton />
                    <RecentReports />
                </ControlsContainer>
            }
            mainContent={<ReportView report={currentReport} />}
        />
    );
}

export default function SummarizerPage() {
    return (
        <ReportsProvider>
            <SummarizerContent />
        </ReportsProvider>
    );
} 