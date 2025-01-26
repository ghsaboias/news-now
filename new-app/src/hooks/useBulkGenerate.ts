import { useReports } from '@/context/ReportsContext';
import { ChannelActivity } from '@/types';
import { useCallback, useState } from 'react';
import { useLoadingState } from './useLoadingState';

interface BulkGenerateState {
    status: 'idle' | 'processing' | 'complete' | 'error';
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

    const generate = useCallback(async ({ timeframe, minMessages }: BulkGenerateOptions) => {
        await withLoading(async () => {
            try {
                setState(prev => ({ ...prev, status: 'processing', channels: [] }));

                const response = await fetch(
                    `/api/reports/bulk-generate?timeframe=${timeframe}&minMessages=${minMessages}`
                );

                if (!response.ok) {
                    throw new Error('Failed to generate reports');
                }

                const data = await response.json();

                // Update reports context with new reports
                if (data.reports?.length > 0) {
                    setCurrentReport(data.reports[data.reports.length - 1]);
                    await fetchReports();
                }

                setState(prev => ({
                    status: 'complete',
                    channels: data.results
                }));
            } catch (error) {
                console.error('Error generating reports:', error);
                setState(prev => ({ ...prev, status: 'error' }));
            }
        });
    }, [withLoading, setCurrentReport, fetchReports]);

    return {
        ...state,
        isLoading,
        generate
    };
} 