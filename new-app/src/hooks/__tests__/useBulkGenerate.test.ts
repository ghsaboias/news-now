import { act, renderHook } from '@testing-library/react';
import { useBulkGenerate } from '../useBulkGenerate';

// Mock dependencies
jest.mock('@/context/ReportsContext', () => ({
    useReports: () => ({
        fetchReports: jest.fn(),
        setCurrentReport: jest.fn()
    })
}));

// Mock EventSource
class MockEventSource {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    close = jest.fn();

    constructor(public url: string) { }

    simulateMessage(data: any) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
    }
}

const mockEventSourceClass = jest.fn().mockImplementation((url: string) => {
    return new MockEventSource(url);
});

(global as any).EventSource = mockEventSourceClass;

describe('useBulkGenerate', () => {
    let eventSource: MockEventSource;

    beforeEach(() => {
        mockEventSourceClass.mockClear();
    });

    it('handles successful generation', async () => {
        const { result } = renderHook(() => useBulkGenerate());

        // Start generation
        await act(async () => {
            await result.current.generate({ timeframe: '1h', minMessages: 10 });
        });

        // Get the event source instance
        eventSource = mockEventSourceClass.mock.results[0].value;

        // Simulate scanning phase
        const mockChannels = [{
            channelId: '1',
            channelName: 'test',
            status: 'processing'
        }];

        await act(async () => {
            eventSource.simulateMessage({ type: 'scanning', channels: mockChannels });
            await Promise.resolve(); // Wait for state update
        });

        expect(result.current.channels).toEqual(mockChannels);

        // Simulate report message
        const mockReport = { channelId: '1', messageCount: 15 };
        await act(async () => {
            eventSource.simulateMessage({ type: 'report', report: mockReport });
            await Promise.resolve(); // Wait for state update
        });

        expect(result.current.channels[0].messageCount).toBe(15);
        expect(result.current.channels[0].status).toBe('success');

        // Simulate completion
        await act(async () => {
            eventSource.simulateMessage({ type: 'complete' });
            await Promise.resolve(); // Wait for state update
        });

        expect(result.current.status).toBe('complete');
        expect(result.current.isLoading).toBe(false);
    });

    it('handles generation error', async () => {
        const { result } = renderHook(() => useBulkGenerate());

        // Start generation
        await act(async () => {
            await result.current.generate({ timeframe: '1h', minMessages: 10 });
        });

        // Get the event source instance
        eventSource = mockEventSourceClass.mock.results[0].value;

        // Simulate error
        await act(async () => {
            eventSource.simulateMessage({ type: 'error', message: 'Test error' });
            await Promise.resolve(); // Wait for state update
        });

        expect(result.current.status).toBe('error');
        expect(result.current.isLoading).toBe(false);
    });
}); 