'use client';

import { Card } from '@/components/layout/Card';
import { Grid } from '@/components/layout/Grid';
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
    <div className="min-h-screen bg-background">
      <div className="max-w-container mx-auto px-page-x py-page-y">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h1 className="
            text-h2 sm:text-h1
            font-medium text-primary
            mb-3
            animate-fade-in
          ">
            Discord Channels
          </h1>
          <p className="text-secondary text-sm sm:text-base max-w-2xl mx-auto animate-fade-in">
            Real-time message activity across all monitored channels
          </p>
        </div>
        
        <div className="max-w-6xl mx-auto">
          <Grid 
            columns={{ sm: 1, md: 2, lg: 3 }} 
            spacing="relaxed"
          >
            {channels.map((channel) => (
              <Card 
                key={channel.id}
                title={channel.name}
                messageCounts={messageCounts[channel.id]}
                loadingPeriods={loadingStates[channel.id] || new Set()}
                className="h-full"
              />
            ))}
          </Grid>
        </div>
      </div>
    </div>
  );
} 