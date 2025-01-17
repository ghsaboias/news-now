'use client';

import { AISummary, DiscordChannel, DiscordMessage } from '@/types';
import { useEffect, useState } from 'react';

// Server Actions
async function fetchChannelsAction(): Promise<DiscordChannel[]> {
  const response = await fetch('/api/discord/channels');
  if (!response.ok) {
    throw new Error('Failed to fetch channels');
  }
  return response.json();
}

async function fetchMessagesAction(channelId: string): Promise<DiscordMessage[]> {
  const response = await fetch(`/api/discord/messages?channelId=${channelId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  return response.json();
}

async function generateSummaryAction(channelId: string, channelName: string): Promise<AISummary> {
  const response = await fetch(`/api/discord/summary?channelId=${channelId}&channelName=${channelName}`);
  if (!response.ok) {
    throw new Error('Failed to generate summary');
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

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

  const fetchMessages = async (channelId: string, channelName: string) => {
    setLoading(true);
    setError('');
    setSelectedChannel(channelName);
    setSummary(null);
    try {
      const [fetchedMessages, newSummary] = await Promise.all([
        fetchMessagesAction(channelId),
        generateSummaryAction(channelId, channelName),
      ]);
      setMessages(fetchedMessages);
      setSummary(newSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">News Now</h1>
          {error && (
            <div className="mt-4 text-red-500 p-4 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </header>

        {/* Channels Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            {channels.map((channel) => (
            <button
                key={channel.id}
                onClick={() => fetchMessages(channel.id, channel.name)}
                disabled={loading}
                className={`p-4 rounded-lg text-left ${
                selectedChannel === channel.name
                    ? 'bg-blue-50 border-blue-200 shadow-md text-black'
                    : 'bg-gray-700 text-white hover:bg-gray-100 hover:text-black'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <h3 className="font-medium truncate">{channel.name}</h3>
            </button>
            ))}
        </div>    

        {/* Content Section */}
        {selectedChannel && (
          <div className="space-y-8">
            {/* AI Summary Section */}
            {summary && (
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{summary.headline}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                  <span className="font-semibold">{summary.location_and_period}</span>
                </div>
                <div className="prose prose-lg max-w-none text-gray-700">
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