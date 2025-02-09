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
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Memoized options to prevent recreating on every render
const TIMEFRAME_OPTIONS: TimeframeOption[] = [
    { value: '1h', label: 'Last Hour' },
    { value: '4h', label: 'Last 4 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
];

// Server Actions
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

async function generateSummaryAction(channelId: string, channelName: string, messages: DiscordMessage[], previousReport?: AISummary): Promise<AISummary> {
    const response = await fetch(`/api/discord/summary?channelId=${channelId}&channelName=${channelName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messages,
            previousSummary: previousReport ? {
                ...previousReport,
                period_start: messages[0].timestamp,
                period_end: messages[messages.length - 1].timestamp
            } : undefined
        }),
    });
    if (!response.ok) {
        throw new Error('Failed to generate summary', { cause: response });
    }
    return response.json();
}

// Separate data fetching logic
const useChannels = () => {
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const loadChannels = async () => {
            try {
                // Check cache first
                const cached = sessionStorage.getItem('discord_channels');
                if (cached) {
                    const { channels: cachedChannels, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < 300000) { // 5 minutes
                        setChannels(cachedChannels);
                        setIsLoading(false);
                        return;
                    }
                }

                const response = await fetch('/api/discord/channels');
                if (!response.ok) throw new Error('Failed to fetch channels');

                const data = await response.json();
                setChannels(data);

                // Update cache
                sessionStorage.setItem('discord_channels', JSON.stringify({
                    channels: data,
                    timestamp: Date.now()
                }));
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch channels'));
            } finally {
                setIsLoading(false);
            }
        };

        loadChannels();
    }, []);

    return { channels, isLoading, error };
};

// Separate progress state management
const useProgress = () => {
    const [progress, setProgress] = useState<{
        stage: string;
        percent?: number;
        messageCount?: number;
    } | null>(null);

    const updateProgress = useCallback((update: Partial<typeof progress> | null) => {
        setProgress(prev => {
            if (update === null) return null;
            const newProgress = prev ? { ...prev, ...update } : { stage: 'Initializing', ...update };
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
                console.log('Progress updated:', newProgress);
            }
            return newProgress;
        });
    }, []);

    return { progress, updateProgress };
};

// Memoized child components for better performance
const MemoizedChannelSelect = memo(ChannelSelect);
const MemoizedTimeSelect = memo(TimeSelect);
const MemoizedProgress = memo(Progress);
const MemoizedReportView = memo(ReportView);
const MemoizedRecentReports = memo(RecentReports);

function SummarizerContent() {
    const { channels, isLoading: isLoadingChannels } = useChannels();
    const { progress, updateProgress } = useProgress();
    const [selectedChannelId, setSelectedChannelId] = useState('');
    const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '24h'>('1h');
    const [isGenerating, setIsGenerating] = useState(false);

    const { setCurrentReport, fetchReports, currentReport, findReportContext } = useReports();

    // Memoize callback functions
    const handleChannelSelect = useCallback((id: string) => {
        setSelectedChannelId(id);
    }, []);

    const handleTimeframeChange = useCallback((timeframe: '1h' | '4h' | '24h') => {
        setSelectedTimeframe(timeframe);
    }, []);

    const handleGenerateReport = useCallback(async () => {
        if (!selectedChannelId || isGenerating) return;

        const channel = channels.find(c => c.id === selectedChannelId);
        if (!channel) return;

        setIsGenerating(true);
        updateProgress({
            stage: 'Initializing',
            percent: 0,
            messageCount: 0
        });

        try {
            // Check cache through API
            const cacheResponse = await fetch(
                `/api/reports/cache?channelId=${selectedChannelId}&timeframe=${selectedTimeframe}`
            );
            const { data: cachedReport } = await cacheResponse.json();

            if (cachedReport) {
                setCurrentReport(cachedReport);
                updateProgress({
                    stage: 'Loaded from cache',
                    percent: 100,
                    messageCount: cachedReport.messageCount
                });
                setIsGenerating(false);
                return;
            }

            // Track generation through API
            await fetch('/api/reports/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: selectedChannelId,
                    timeframe: selectedTimeframe,
                    status: 'started'
                })
            });

            // Fetch messages phase (0-45%)
            const messages = await fetchMessagesAction(
                selectedChannelId,
                channel.name,
                selectedTimeframe,
                async (count) => {
                    const progress = count ? Math.min(45, Math.round((count / 50) * 45)) : 0;
                    updateProgress({
                        stage: 'Fetching messages',
                        messageCount: count || 0,
                        percent: progress
                    });

                    // Update progress through API
                    await fetch('/api/reports/progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            channelId: selectedChannelId,
                            timeframe: selectedTimeframe,
                            progress
                        })
                    });
                }
            );

            if (!messages.length) {
                updateProgress({
                    stage: 'No messages found',
                    percent: 100,
                    messageCount: 0
                });
                return;
            }

            // Summary generation phase (45-85%)
            updateProgress({
                stage: 'Analyzing messages',
                percent: 45,
                messageCount: messages.length
            });

            // Use the report context system
            const reportContext = await findReportContext(selectedChannelId, selectedTimeframe);
            const previousSummary = reportContext?.primary?.summary;

            const summary = await generateSummaryAction(
                selectedChannelId,
                channel.name,
                messages,
                previousSummary
            );

            updateProgress({
                stage: 'Generating summary',
                percent: 70,
                messageCount: messages.length
            });

            // Save report phase (85-100%)
            updateProgress({
                stage: 'Saving report',
                percent: 85,
                messageCount: messages.length
            });

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

            // Save to cache through API
            await fetch('/api/reports/cache', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: selectedChannelId,
                    timeframe: selectedTimeframe,
                    report
                })
            });

            // Save to database
            await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report),
            });

            setCurrentReport(report);
            await fetchReports();

            updateProgress({
                stage: 'Complete',
                percent: 100,
                messageCount: messages.length
            });

        } catch (error) {
            console.error('Error generating report:', error);
            updateProgress({
                stage: 'Error generating report',
                percent: 100,
                messageCount: 0
            });
        } finally {
            setIsGenerating(false);
            setTimeout(() => {
                updateProgress(null);
            }, 2000);
        }
    }, [
        selectedChannelId,
        channels,
        selectedTimeframe,
        isGenerating,
        currentReport,
        updateProgress,
        setCurrentReport,
        fetchReports,
        findReportContext
    ]);

    // Memoize controls
    const controls = useMemo(() => (
        isLoadingChannels ? (
            <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-gray-700/50 rounded-lg" />
                <div className="h-10 bg-gray-700/50 rounded-lg" />
                <div className="h-10 bg-gray-700/50 rounded-lg" />
            </div>
        ) : (
            <>
                <MemoizedChannelSelect
                    channels={channels}
                    selectedChannelId={selectedChannelId}
                    onSelect={handleChannelSelect}
                    disabled={isGenerating}
                />

                <MemoizedTimeSelect
                    value={selectedTimeframe}
                    onChange={handleTimeframeChange}
                    options={TIMEFRAME_OPTIONS}
                    disabled={isGenerating}
                />

                <div className="space-y-3">
                    <Button
                        onClick={handleGenerateReport}
                        disabled={!selectedChannelId || isGenerating}
                        loading={isGenerating}
                        fullWidth
                    >
                        {isGenerating ? 'Generating...' : 'Create Report'}
                    </Button>
                    {progress && (
                        <MemoizedProgress
                            stage={progress.stage}
                            value={progress.percent}
                        />
                    )}
                </div>
            </>
        )
    ), [
        isLoadingChannels,
        channels,
        selectedChannelId,
        isGenerating,
        progress,
        selectedTimeframe,
        handleChannelSelect,
        handleTimeframeChange,
        handleGenerateReport
    ]);

    return (
        <SplitView
            sidebarContent={
                <ControlsContainer
                    mainControls={controls}
                    bulkControls={<BulkGenerateButton />}
                    recentReports={<MemoizedRecentReports />}
                />
            }
            mainContent={<MemoizedReportView report={currentReport} />}
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