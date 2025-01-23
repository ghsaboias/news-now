import { useReports } from '@/context/ReportsContext';
import { act, renderHook } from '@testing-library/react';
import { useBulkGenerate } from '../useBulkGenerate';

// Mock useReports hook
jest.mock('@/context/ReportsContext', () => ({
    useReports: jest.fn()
}));

// Mock EventSource
class MockEventSource {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    close = jest.fn();

    constructor(public url: string) { }

    // Helper to simulate messages
    simulateMessage(data: any) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', {
                data: JSON.stringify(data)
            }));
        }
    }

    // Helper to simulate errors
    simulateError() {
        if (this.onerror) {
            this.onerror(new Event('error'));
        }
    }
}

// Replace global EventSource with mock
(global as any).EventSource = MockEventSource;

describe('useBulkGenerate', () => {
    const mockFetchReports = jest.fn();
    const mockSetCurrentReport = jest.fn();

    beforeEach(() => {
        (useReports as jest.Mock).mockReturnValue({
            fetchReports: mockFetchReports,
            setCurrentReport: mockSetCurrentReport
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('initializes with default state', () => {
        const { result } = renderHook(() => useBulkGenerate());

        expect(result.current.isLoading).toBe(false);
        expect(result.current.status).toBe('idle');
        expect(result.current.channels).toEqual([]);
    });

    it('handles successful generation', async () => {
        const { result } = renderHook(() => useBulkGenerate());

        // Start generation
        act(() => {
            result.current.generate({ timeframe: '1h', minMessages: 10 });
        });

        // Check initial loading state
        expect(result.current.isLoading).toBe(true);
        expect(result.current.status).toBe('scanning');
        expect(result.current.channels).toEqual([]);

        // Simulate scanning message
        const mockChannels = [{ channelId: '1', channelName: 'test', status: 'processing' }];
        act(() => {
            const eventSource = new MockEventSource('');
            eventSource.simulateMessage({ type: 'scanning', channels: mockChannels });
        });
        expect(result.current.channels).toEqual(mockChannels);

        // Simulate report message
        const mockReport = { channelId: '1', messageCount: 15 };
        act(() => {
            const eventSource = new MockEventSource('');
            eventSource.simulateMessage({ type: 'report', report: mockReport });
        });
        expect(mockSetCurrentReport).toHaveBeenCalledWith(mockReport);
        expect(mockFetchReports).toHaveBeenCalled();

        // Simulate completion
        act(() => {
            const eventSource = new MockEventSource('');
            eventSource.simulateMessage({ type: 'complete' });
        });
        expect(result.current.isLoading).toBe(false);
        expect(result.current.status).toBe('complete');
    });

    it('handles generation error', async () => {
        const { result } = renderHook(() => useBulkGenerate());

        // Start generation
        act(() => {
            result.current.generate({ timeframe: '1h', minMessages: 10 });
        });

        // Simulate error
        act(() => {
            const eventSource = new MockEventSource('');
            eventSource.simulateError();
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.status).toBe('error');
    });
}); 