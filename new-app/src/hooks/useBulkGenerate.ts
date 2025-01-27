import { useReports } from '@/context/ReportsContext';
import { ChannelActivity } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { useLoadingState } from './useLoadingState';

interface BulkGenerateState {
    status: 'idle' | 'processing' | 'complete' | 'error';
    channels: ChannelActivity[];
    error?: string;
}

interface BulkGenerateOptions {
    timeframe: '1h' | '4h' | '24h';
    minMessages: number;
}

export function useBulkGenerate() {
    const { fetchReports, setCurrentReport } = useReports();
    const { isLoading, withLoading } = useLoadingState();
    const [state, setState] = useState<BulkGenerateState>({
        status: 'idle',
        channels: []
    });

    // Cleanup function for EventSource
    const [eventSource, setEventSource] = useState<EventSource | null>(null);
    useEffect(() => {
        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [eventSource]);

    const generate = useCallback(async ({ timeframe, minMessages }: BulkGenerateOptions) => {
        // Close any existing connection
        if (eventSource) {
            eventSource.close();
        }

        setState({ status: 'processing', channels: [] });

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

        es.addEventListener('progress', ((event: MessageEvent) => {
            const update = JSON.parse(event.data);
            setState(prev => ({
                ...prev,
                channels: prev.channels.map(channel =>
                    channel.channelId === update.channelId
                        ? { ...channel, ...update }
                        : channel
                )
            }));
        }) as EventListener);

        es.addEventListener('complete', ((event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.reports?.length > 0) {
                setCurrentReport(data.reports[data.reports.length - 1]);
                fetchReports();
            }
            setState(prev => ({
                ...prev,
                status: 'complete'
            }));
            es.close();
        }) as EventListener);

        es.addEventListener('error', ((event: MessageEvent) => {
            const data = event.data ? JSON.parse(event.data) : { error: 'Connection error' };
            setState(prev => ({
                ...prev,
                status: 'error',
                error: data.error
            }));
            es.close();
        }) as EventListener);

        // Handle connection errors
        es.onerror = () => {
            setState(prev => ({
                ...prev,
                status: 'error',
                error: 'Connection error'
            }));
            es.close();
        };
    }, [eventSource, setCurrentReport, fetchReports]);

    return {
        ...state,
        isLoading,
        generate
    };
} 