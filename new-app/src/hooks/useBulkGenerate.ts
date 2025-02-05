import { useReports } from '@/context/ReportsContext';
import { ChannelActivity } from '@/types/discord';
import { Report } from '@/types/report';
import { useCallback, useEffect, useRef, useState } from 'react';

interface BulkGenerateState {
    status: 'idle' | 'processing' | 'complete' | 'error';
    channels: ChannelActivity[];
    error?: string;
    pendingReport?: Report;
    queueStatus?: {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        error: number;
    };
}

interface BulkGenerateOptions {
    timeframe: '1h' | '4h' | '24h';
    minMessages: number;
}

export function useBulkGenerate() {
    const { fetchReports, setCurrentReport, addReport } = useReports();
    const [state, setState] = useState<BulkGenerateState>({
        status: 'idle',
        channels: [],
        error: undefined
    });
    const hasSetFirstReport = useRef(false);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Handle report updates outside of render cycle
    useEffect(() => {
        if (state.pendingReport) {
            addReport(state.pendingReport);
            if (!hasSetFirstReport.current) {
                hasSetFirstReport.current = true;
                setCurrentReport(state.pendingReport);
            }
            // Clear pending report after processing
            setState(prev => ({ ...prev, pendingReport: undefined }));
        }
    }, [state.pendingReport, addReport, setCurrentReport]);

    // Cleanup function for EventSource
    useEffect(() => {
        return () => {
            if (eventSource) {
                eventSource.close();
                hasSetFirstReport.current = false;
            }
        };
    }, [eventSource]);

    const generate = useCallback(async ({ timeframe, minMessages }: BulkGenerateOptions) => {
        try {
            setIsLoading(true);
            // Reset state
            hasSetFirstReport.current = false;

            // Close any existing connection
            if (eventSource) {
                eventSource.close();
            }

            setState({ status: 'processing', channels: [], error: undefined });

            const es = new EventSource(
                `/api/reports/bulk-generate?timeframe=${timeframe}&minMessages=${minMessages}`
            );

            setEventSource(es);

            es.addEventListener('channels', ((event: MessageEvent) => {
                const data = JSON.parse(event.data);
                setState(prev => ({
                    ...prev,
                    channels: data.channels
                }));
            }) as EventListener);

            es.addEventListener('status', ((event: MessageEvent) => {
                const status = JSON.parse(event.data);
                setState(prev => ({
                    ...prev,
                    queueStatus: {
                        total: status.total,
                        pending: status.pending,
                        processing: status.processing,
                        completed: status.completed,
                        error: status.error
                    }
                }));
            }) as EventListener);

            es.addEventListener('progress', ((event: MessageEvent) => {
                const update = JSON.parse(event.data);
                setState(prev => {
                    const updatedChannels = prev.channels.map(channel =>
                        channel.channelId === update.channelId
                            ? { ...channel, ...update }
                            : channel
                    );

                    // Queue report for processing in useEffect
                    if (update.status === 'success' && update.report) {
                        return {
                            ...prev,
                            channels: updatedChannels,
                            pendingReport: update.report
                        };
                    }

                    return {
                        ...prev,
                        channels: updatedChannels
                    };
                });
            }) as EventListener);

            es.addEventListener('complete', ((event: MessageEvent) => {
                setState(prev => ({
                    ...prev,
                    status: 'complete'
                }));
                es.close();
                setIsLoading(false);
            }) as EventListener);

            es.addEventListener('error', ((event: MessageEvent) => {
                const data = event.data ? JSON.parse(event.data) : { error: 'Connection error' };
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    error: data.error
                }));
                es.close();
                setIsLoading(false);
            }) as EventListener);

            // Handle connection errors
            es.onerror = () => {
                setState(prev => ({
                    ...prev,
                    status: 'error',
                    error: 'Connection error'
                }));
                es.close();
                setIsLoading(false);
            };
        } catch (error) {
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            }));
            setIsLoading(false);
        }
    }, [eventSource]);

    return {
        ...state,
        isLoading,
        generate
    };
} 