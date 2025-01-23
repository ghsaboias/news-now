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
      const channelData = await getChannels();
      setChannels(channelData);

      const initialLoadingStates: LoadingState = {};
      channelData.forEach(channel => {
        initialLoadingStates[channel.id] = new Set(['1h', '4h', '24h']);
      });
      setLoadingStates(initialLoadingStates);

      const eventSource = new EventSource(
        `http://localhost:3000/api/discord/channels/messages?channelIds=${channelData.map(c => c.id).join(',')}&periods=1h,4h,24h`
      );

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'update') {
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
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-dark)] to-[color-mix(in_srgb,var(--bg-dark),#000_15%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="text-center mb-6 sm:mb-8 lg:mb-10">
          <h1 className="text-xl sm:text-2xl lg:text-[2rem] font-medium text-[var(--text-primary)] mb-2">
            Discord Channels
          </h1>
          <p className="text-[var(--text-secondary)] text-sm max-w-2xl mx-auto">
            Real-time message activity across all monitored channels
          </p>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {channels.map((channel) => (
              <Card 
                key={channel.id}
                title={channel.name}
                messageCounts={messageCounts[channel.id]}
                loadingPeriods={loadingStates[channel.id] || new Set()}
                className="h-full"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 