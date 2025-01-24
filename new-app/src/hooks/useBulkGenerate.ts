import { useReports } from '@/context/ReportsContext';
import { ChannelActivity } from '@/types';
import { useCallback, useState } from 'react';
import { useEventSource } from './useEventSource';
import { useLoadingState } from './useLoadingState';

interface BulkGenerateState {
    status: 'idle' | 'scanning' | 'complete' | 'error';
    channels: ChannelActivity[];
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

    const [url, setUrl] = useState<string | null>(null);

    useEventSource(url || '', {
        onMessage: (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'scanning':
                    setState(prev => ({ ...prev, channels: data.channels }));
                    break;

                case 'report':
                    setCurrentReport(data.report);
                    setState(prev => ({
                        ...prev,
                        channels: prev.channels.map(ch =>
                            ch.channelId === data.report.channelId
                                ? { ...ch, status: 'success', messageCount: data.report.messageCount }
                                : ch
                        )
                    }));
                    fetchReports();
                    break;

                case 'complete':
                    setState(prev => ({ ...prev, status: 'complete' }));
                    setUrl(null);
                    break;

                case 'error':
                    setState(prev => ({ ...prev, status: 'error' }));
                    setUrl(null);
                    break;
            }
        },
        onError: () => {
            setState(prev => ({ ...prev, status: 'error' }));
            setUrl(null);
        }
    });

    const generate = useCallback(async ({ timeframe, minMessages }: BulkGenerateOptions) => {
        await withLoading(async () => {
            try {
                setState(prev => ({ ...prev, status: 'scanning', channels: [] }));
                setUrl(`/api/reports/bulk-generate?timeframe=${timeframe}&minMessages=${minMessages}`);
            } catch (_) {
                setState(prev => ({ ...prev, status: 'error' }));
                setUrl(null);
            }
        });
    }, [withLoading]);

    return {
        ...state,
        isLoading,
        generate
    };
} 