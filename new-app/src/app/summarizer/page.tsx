'use client';

// Chrome Performance Memory API types
declare global {
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
        }
    }
}

import { Button } from '@/components/common/Button';
import { Progress } from '@/components/common/Progress';
import { BulkGenerateButton } from '@/components/controls/bulk-generate/BulkGenerateButton';
import { ChannelSelect } from '@/components/controls/ChannelSelect';
import { ControlsContainer } from '@/components/controls/ControlsContainer';
import { TimeSelect, TimeframeOption } from '@/components/controls/TimeSelect';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { SplitView } from '@/components/layout/SplitView';
import { RecentReports } from '@/components/reports/RecentReports';
import { ReportView } from '@/components/reports/ReportView';
import { ReportsProvider, useReports } from '@/context/ReportsContext';
import type { AISummary, DiscordChannel, DiscordMessage } from '@/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Performance logging helper
const perf = {
    metrics: new Map<string, { start: number; batches?: number; items?: number }>(),
    
    start: (label: string) => {
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
    
    end: (label: string, details?: { batches?: number; items?: number }) => {
        const endTime = performance.now();
        const metric = perf.metrics.get(label);
        
        if (metric) {
            const duration = endTime - metric.start;
            console.timeEnd(`⏱️ ${label}`);
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);
            
            // Log detailed metrics
            const stats = {
                durationMs: Math.round(duration),
                ...(details?.batches && { batchesProcessed: details.batches }),
                ...(details?.items && { itemsProcessed: details.items }),
                ...(details?.batches && details?.items && { 
                    avgItemsPerBatch: Math.round(details.items / details.batches),
                    avgTimePerBatch: Math.round(duration / details.batches)
                })
            };
            
            console.log(`📈 ${label} stats:`, stats);
            perf.metrics.delete(label);
        }
    },
    
    batch: (label: string, batchSize: number) => {
        const metric = perf.metrics.get(label);
        if (metric) {
            metric.batches = (metric.batches || 0) + 1;
            metric.items = (metric.items || 0) + batchSize;
            perf.metrics.set(label, metric);
        }
    }
};

// Component render counter
function useRenderCount(componentName: string) {
    const renderCount = useRef(0);
    
    useEffect(() => {
        renderCount.current += 1;
        console.log(`🔄 ${componentName} render #${renderCount.current}`);
    });
    
    return renderCount.current;
}

// Server Actions
async function fetchChannelsAction(): Promise<DiscordChannel[]> {
    perf.start('fetchChannels');
    try {
        const response = await fetch('/api/discord/channels');
        if (!response.ok) {
            throw new Error('Failed to fetch channels', { cause: response });
        }
        const channels = await response.json();
        return channels;
    } finally {
        perf.end('fetchChannels');
    }
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
    const renderCount = useRenderCount('SummarizerContent');
    const [state, setState] = useState({
        channels: [] as DiscordChannel[],
        isLoadingChannels: true,
        selectedChannelId: '',
        selectedTimeframe: '1h' as '1h' | '4h' | '24h',
        loading: false,
        progress: null as { step: string; percent?: number; messageCount?: number } | null
    });
    
    // Memoize reports context values to prevent unnecessary renders
    const reportsContext = useReports();
    const { setCurrentReport, fetchReports } = reportsContext;
    const currentReport = useMemo(() => reportsContext.currentReport, [reportsContext.currentReport]);

    const timeframeOptions = useMemo<TimeframeOption[]>(() => [
        { value: '1h', label: 'Last Hour' },
        { value: '4h', label: 'Last 4 Hours' },
        { value: '24h', label: 'Last 24 Hours' },
    ], []);

    // Memoize state update callbacks
    const handleChannelSelect = useCallback((id: string) => {
        setState(prev => ({ ...prev, selectedChannelId: id }));
    }, []);

    const handleTimeframeSelect = useCallback((value: '1h' | '4h' | '24h') => {
        setState(prev => ({ ...prev, selectedTimeframe: value }));
    }, []);

    const updateProgress = useCallback((progressUpdate: Partial<typeof state.progress>) => {
        setState(prev => ({
            ...prev,
            progress: prev.progress ? { ...prev.progress, ...progressUpdate } : null
        }));
    }, []);

    // Load channels only once and cache the result
    useEffect(() => {
        let mounted = true;
        const channelsCache = sessionStorage.getItem('discord_channels');
        
        if (channelsCache) {
            const cached = JSON.parse(channelsCache);
            const cacheAge = Date.now() - cached.timestamp;
            
            // Use cache if less than 5 minutes old
            if (cacheAge < 300000) {
                setState(prev => ({
                    ...prev,
                    channels: cached.channels,
                    isLoadingChannels: false
                }));
                return;
            }
        }
        
        console.log('🔄 Initializing SummarizerContent');
        perf.start('initialLoad');
        
        fetchChannelsAction()
            .then(channels => {
                if (!mounted) return;
                console.log(`📊 Loaded ${channels.length} channels`);
                
                // Update cache
                sessionStorage.setItem('discord_channels', JSON.stringify({
                    channels,
                    timestamp: Date.now()
                }));
                
                setState(prev => ({
                    ...prev,
                    channels,
                    isLoadingChannels: false
                }));
            })
            .catch(console.error)
            .finally(() => {
                if (!mounted) return;
                perf.end('initialLoad', { items: state.channels.length });
            });

        return () => { mounted = false; };
    }, []);

    const handleGenerateReport = useCallback(async () => {
        if (!state.selectedChannelId) return;

        const channel = state.channels.find(c => c.id === state.selectedChannelId);
        if (!channel) return;

        let totalBatches = 0;
        let totalMessages = 0;
        let currentMessageCount = 0;
        let batchUpdateTimeout: NodeJS.Timeout | null = null;

        // Batch update function to reduce renders
        const batchUpdate = (updates: Partial<typeof state>) => {
            if (batchUpdateTimeout) {
                clearTimeout(batchUpdateTimeout);
            }
            // Debounce updates to reduce renders
            batchUpdateTimeout = setTimeout(() => {
                setState(prev => ({
                    ...prev,
                    ...updates
                }));
            }, 100); // Wait 100ms before applying updates
        };

        perf.start('totalReportGeneration');
        batchUpdate({
            loading: true,
            progress: { step: 'Fetching messages', percent: 0, messageCount: 0 }
        });
        
        try {
            perf.start('messageFetch');
            const messages = await fetchMessagesAction(
                state.selectedChannelId,
                channel.name,
                state.selectedTimeframe,
                (batchCount: number) => {
                    if (typeof batchCount !== 'number') return;
                    
                    currentMessageCount += batchCount;
                    totalBatches++;
                    totalMessages += batchCount;
                    
                    perf.batch('messageFetch', batchCount);
                    console.log(`📨 Fetched batch of ${batchCount} messages. Total: ${currentMessageCount}`);
                    
                    // Update progress less frequently
                    if (totalBatches % 3 === 0 || currentMessageCount === batchCount) {
                        batchUpdate({
                            progress: {
                                step: 'Fetching messages',
                                messageCount: currentMessageCount,
                                percent: Math.min(45, Math.round((currentMessageCount / 50) * 45))
                            }
                        });
                    }
                }
            );
            perf.end('messageFetch', { batches: totalBatches, items: totalMessages });
            
            if (!messages.length) {
                console.log('⚠️ No messages found');
                batchUpdate({
                    progress: { step: 'No messages found in the selected timeframe', percent: 100 },
                    loading: false
                });
                return;
            }

            batchUpdate({
                progress: {
                    step: 'Generating summary',
                    percent: 50,
                    messageCount: messages.length
                }
            });
            
            perf.start('summaryGeneration');
            const summary = await generateSummaryAction(state.selectedChannelId, channel.name, messages);
            perf.end('summaryGeneration');
            
            batchUpdate({
                progress: {
                    step: 'Saving report',
                    percent: 90,
                    messageCount: messages.length
                }
            });

            const report = {
                id: uuidv4(),
                channelId: state.selectedChannelId,
                channelName: channel.name,
                timestamp: new Date().toISOString(),
                timeframe: {
                    type: state.selectedTimeframe,
                    start: messages[0].timestamp,
                    end: messages[messages.length - 1].timestamp,
                },
                messageCount: messages.length,
                summary,
            };

            perf.start('reportSave');
            await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(report),
            });
            perf.end('reportSave');

            setCurrentReport(report);
            await fetchReports();
            
            batchUpdate({
                progress: {
                    step: 'Complete',
                    percent: 100,
                    messageCount: messages.length
                }
            });
        } catch (error) {
            console.error('❌ Error generating report:', error);
            batchUpdate({
                progress: { step: 'Error generating report', percent: 100 }
            });
        } finally {
            perf.end('totalReportGeneration', { 
                batches: totalBatches,
                items: totalMessages
            });
            batchUpdate({ loading: false });
            setTimeout(() => batchUpdate({ progress: null }), 2000);
        }
    }, [state.selectedChannelId, state.channels, state.selectedTimeframe, setCurrentReport, fetchReports]);

    // Memoize the rendered content
    const controls = useMemo(() => (
        state.isLoadingChannels ? (
            <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-gray-700/50 rounded-lg" />
                <div className="h-10 bg-gray-700/50 rounded-lg" />
                <div className="h-10 bg-gray-700/50 rounded-lg" />
            </div>
        ) : (
            <>
                <ChannelSelect
                    channels={state.channels}
                    selectedChannelId={state.selectedChannelId}
                    onSelect={handleChannelSelect}
                    disabled={state.loading}
                />
                
                <TimeSelect
                    value={state.selectedTimeframe}
                    onChange={handleTimeframeSelect}
                    options={timeframeOptions}
                    disabled={state.loading}
                />

                <div className="space-y-3">
                    <Button
                        onClick={handleGenerateReport}
                        disabled={!state.selectedChannelId}
                        loading={state.loading}
                        fullWidth
                    >
                        {state.loading ? 'Generating...' : 'Create Report'}
                    </Button>
                    {state.progress && (
                        <Progress
                            stage={state.progress.step}
                            value={state.progress.percent}
                            messageCount={state.progress.messageCount}
                        />
                    )}
                </div>
            </>
        )
    ), [
        state.isLoadingChannels,
        state.channels,
        state.selectedChannelId,
        state.loading,
        state.selectedTimeframe,
        state.progress,
        handleChannelSelect,
        handleTimeframeSelect,
        handleGenerateReport,
        timeframeOptions
    ]);

    return (
        <SplitView
            sidebarContent={
                <ControlsContainer
                    mainControls={controls}
                    bulkControls={<BulkGenerateButton />}
                    recentReports={<RecentReports />}
                />
            }
            mainContent={<ReportView report={currentReport} />}
        />
    );
}

export default function SummarizerPage() {
    return (
        <ReportsProvider>
            <ErrorBoundary>
                <SummarizerContent />
            </ErrorBoundary>
        </ReportsProvider>
    );
} 