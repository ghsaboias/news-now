'use client';

import { Card } from '@/components/layout/Card';
import { DiscordChannel } from '@/types';
import { useEffect, useState } from 'react';

interface MessageCounts {
  [channelId: string]: {
    [period: string]: number;
  };
}

interface LoadingState {
  [channelId: string]: Set<string>;
}

async function getChannels(): Promise<DiscordChannel[]> {
  const res = await fetch('http://localhost:3000/api/discord/channels', {
    cache: 'no-store'
  });
  
  if (!res.ok) {
    throw new Error('Failed to fetch channels');
  }
  
  return res.json();
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [messageCounts, setMessageCounts] = useState<MessageCounts>({});
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  useEffect(() => {
    const fetchData = async () => {
      // Fetch channels first
      const channelData = await getChannels();
      setChannels(channelData);

      // Initialize loading states for all channels and periods
      const initialLoadingStates: LoadingState = {};
      channelData.forEach(channel => {
        initialLoadingStates[channel.id] = new Set(['1h', '4h', '24h']);
      });
      setLoadingStates(initialLoadingStates);

      // Start SSE connection for message counts
      const eventSource = new EventSource(
        `http://localhost:3000/api/discord/channels/messages?channelIds=${channelData.map(c => c.id).join(',')}&periods=1h,4h,24h`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'update') {
          // Update message counts
          setMessageCounts(prev => {
            const newCounts = { ...prev };
            data.results.forEach(({ channelId, period, count }: any) => {
              if (!newCounts[channelId]) {
                newCounts[channelId] = {};
              }
              newCounts[channelId][period] = count;
            });
            return newCounts;
          });

          // Update loading states
          setLoadingStates(prev => {
            const newStates = { ...prev };
            data.results.forEach(({ channelId, period }: any) => {
              if (newStates[channelId]) {
                const updatedSet = new Set(newStates[channelId]);
                updatedSet.delete(period);
                newStates[channelId] = updatedSet;
              }
            });
            return newStates;
          });
        }

        if (data.type === 'complete' || data.type === 'error') {
          eventSource.close();
          setLoadingStates({});
        }
      };

      return () => {
        eventSource.close();
      };
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Discord Channels</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {channels.map((channel) => (
          <Card 
            key={channel.id} 
            title={channel.name}
            messageCounts={messageCounts[channel.id]}
            loadingPeriods={loadingStates[channel.id] || new Set()}
            className="cursor-pointer hover:border-gray-600 transition-colors"
          />
        ))}
      </div>
    </div>
  );
} 