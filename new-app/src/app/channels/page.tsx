'use client';

import { Card } from '@/components/layout/Card';
import { Grid } from '@/components/layout/Grid';
import { LoadingState, MessageCounts, UpdateData } from '@/types/channels';
import { DiscordChannel } from '@/types/discord';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Performance logging helper
const perf = {
    metrics: new Map<string, { start: number; updates?: number }>(),

    start: (label: string) => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        const startTime = performance.now();
        console.time(`⏱️ ${label}`);
        performance.mark(`${label}-start`);
        perf.metrics.set(label, { start: startTime });

        // Log memory if available
        if (performance.memory) {
            console.log(`📊 Memory before ${label}:`, {
                usedHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                totalHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
            });
        }
    },

    end: (label: string, details?: { updates?: number }) => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        const endTime = performance.now();
        const metric = perf.metrics.get(label);

        if (metric) {
            const duration = endTime - metric.start;
            console.timeEnd(`⏱️ ${label}`);
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);

            console.log(`📈 ${label} stats:`, {
                durationMs: Math.round(duration),
                ...(details?.updates && { updatesProcessed: details.updates })
            });
            perf.metrics.delete(label);
        }
    }
};

async function getChannels(): Promise<DiscordChannel[]> {
    // Only start performance monitoring on client side
    if (typeof window !== 'undefined') {
        perf.start('fetchChannels');
    }

    try {
        const channelsCache = sessionStorage.getItem('discord_channels');
        if (channelsCache) {
            const cached = JSON.parse(channelsCache);
            const cacheAge = Date.now() - cached.timestamp;

            // Use cache if less than 5 minutes old
            if (cacheAge < 300000) {
                return cached.channels;
            }
        }

        const res = await fetch('/api/discord/channels', {
            cache: 'no-store'
        });

        if (!res.ok) {
            throw new Error('Failed to fetch channels');
        }

        const channels = await res.json();

        // Update cache only on client side
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('discord_channels', JSON.stringify({
                channels,
                timestamp: Date.now()
            }));
        }

        return channels;
    } finally {
        if (typeof window !== 'undefined') {
            perf.end('fetchChannels');
        }
    }
}

export default function ChannelsPage() {
    const [state, setState] = useState({
        channels: [] as DiscordChannel[],
        messageCounts: {} as MessageCounts,
        loadingStates: {} as LoadingState,
        updateCount: 0
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setSelectedChannel] = useState<string | null>(null);

    // Memoize state updates
    const updateMessageCounts = useCallback((data: UpdateData) => {
        setState(prev => {
            const newCounts = { ...prev.messageCounts };
            data.results.forEach(({ channelId, period, count }) => {
                if (!newCounts[channelId]) {
                    newCounts[channelId] = {};
                }
                newCounts[channelId][period] = count;
            });
            return {
                ...prev,
                messageCounts: newCounts,
                updateCount: prev.updateCount + 1
            };
        });
    }, []);

    const updateLoadingStates = useCallback((data: UpdateData) => {
        setState(prev => {
            const newStates = { ...prev.loadingStates };
            data.results.forEach(({ channelId, period }) => {
                if (newStates[channelId]) {
                    const updatedSet = new Set(newStates[channelId]);
                    updatedSet.delete(period);
                    newStates[channelId] = updatedSet;
                }
            });
            return { ...prev, loadingStates: newStates };
        });
    }, []);

    useEffect(() => {
        let mounted = true;
        let eventSource: EventSource | null = null;

        const fetchData = async () => {
            perf.start('initialLoad');
            try {
                const channelData = await getChannels();
                if (!mounted) return;

                const initialLoadingStates: LoadingState = {};
                channelData.forEach(channel => {
                    initialLoadingStates[channel.id] = new Set(['1h', '4h', '24h']);
                });

                setState(prev => ({
                    ...prev,
                    channels: channelData,
                    loadingStates: initialLoadingStates
                }));

                eventSource = new EventSource(
                    `/api/discord/channels/messages?channelIds=${channelData.map(c => c.id).join(',')}&periods=1h,4h,24h`
                );

                eventSource.onmessage = (event) => {
                    if (!mounted) return;
                    const data = JSON.parse(event.data);

                    if (data.type === 'update') {
                        updateMessageCounts(data);
                        updateLoadingStates(data);
                    }

                    if (data.type === 'complete' || data.type === 'error') {
                        eventSource?.close();
                        setState(prev => ({ ...prev, loadingStates: {} }));
                        perf.end('initialLoad', { updates: state.updateCount });
                    }
                };
            } catch (error) {
                console.error('Error fetching data:', error);
                perf.end('initialLoad');
            }
        };

        fetchData();

        return () => {
            mounted = false;
            eventSource?.close();
        };
    }, [updateMessageCounts, updateLoadingStates, state.updateCount]);

    // Memoize the grid content
    const gridContent = useMemo(() => (
        <Grid
            columns={{ sm: 1, md: 2, lg: 3 }}
            spacing="relaxed"
        >
            {state.channels.map((channel) => (
                <Card
                    key={channel.id}
                    title={channel.name}
                    messageCounts={state.messageCounts[channel.id]}
                    loadingPeriods={state.loadingStates[channel.id] || new Set()}
                    className="h-full"
                />
            ))}
        </Grid>
    ), [state.channels, state.messageCounts, state.loadingStates]);

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
                    {gridContent}
                </div>
            </div>
        </div>
    );
} 