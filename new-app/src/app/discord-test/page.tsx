'use client';

import { AISummary, DiscordChannel, DiscordMessage } from '@/types';
import { useEffect, useState } from 'react';

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
  const [progress, setProgress] = useState<{
    batchCount: number;
    totalMessages: number;
    processing: boolean;
  }>({
    batchCount: 0,
    totalMessages: 0,
    processing: false
  });

  // Fetch channels on component mount
  useEffect(() => {
    fetchChannels();
  }, []);

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
      </div>
    </div>
  );
} 