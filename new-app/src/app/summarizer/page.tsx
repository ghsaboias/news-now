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

function SummarizerContent() {
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState('');
    const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '24h'>('1h');
    const [loading, setLoading] = useState(false);
    const { setCurrentReport } = useReports();

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

        setLoading(true);
        try {
            const messages = await fetchMessagesAction(selectedChannelId, selectedTimeframe);
            if (messages.length === 0) {
                console.log('No messages found');
                return;
            }

            const channel = channels.find(c => c.id === selectedChannelId);
            if (!channel) return;

            const summary = await generateSummaryAction(selectedChannelId, channel.name, messages);
            
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

            setCurrentReport(report);
        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setLoading(false);
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

                    <div className="mt-8">
                        <BulkGenerateButton />
                    </div>

                    <div className="mt-8">
                        <RecentReports />
                    </div>
                </ControlsContainer>
            }
            mainContent={<ReportView />}
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