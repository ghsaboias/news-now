import { renderHook } from '@testing-library/react';
import { useEventSource } from '../useEventSource';

// Mock EventSource
class MockEventSource {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    close = jest.fn();

    constructor(public url: string) { }

    // Helper to simulate messages
    simulateMessage(data: any) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
    }

    // Helper to simulate errors
    simulateError() {
        if (this.onerror) {
            this.onerror(new Event('error'));
        }
    }

    // Helper to simulate open
    simulateOpen() {
        if (this.onopen) {
            this.onopen(new Event('open'));
        }
    }
}

// Replace global EventSource with mock
(global as any).EventSource = MockEventSource;

describe('useEventSource', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('creates EventSource with provided URL', () => {
        const url = '/api/events';
        renderHook(() => useEventSource(url));
        expect(EventSource).toHaveBeenCalledWith(url);
    });

    it('handles messages', () => {
        const onMessage = jest.fn();
        const { result } = renderHook(() => useEventSource('/api/events', { onMessage }));

        const eventSource = result.current as unknown as MockEventSource;
        const testData = { type: 'test', value: 123 };
        eventSource.simulateMessage(testData);

        expect(onMessage).toHaveBeenCalledWith(expect.any(MessageEvent));
        expect(JSON.parse(onMessage.mock.calls[0][0].data)).toEqual(testData);
    });

    it('handles errors', () => {
        const onError = jest.fn();
        const { result } = renderHook(() => useEventSource('/api/events', { onError }));

        const eventSource = result.current as unknown as MockEventSource;
        eventSource.simulateError();

        expect(onError).toHaveBeenCalledWith(expect.any(Event));
    });

    it('handles open events', () => {
        const onOpen = jest.fn();
        const { result } = renderHook(() => useEventSource('/api/events', { onOpen }));

        const eventSource = result.current as unknown as MockEventSource;
        eventSource.simulateOpen();

        expect(onOpen).toHaveBeenCalledWith(expect.any(Event));
    });

    it('closes EventSource on unmount', () => {
        const { result, unmount } = renderHook(() => useEventSource('/api/events'));
        const eventSource = result.current as unknown as MockEventSource;

        unmount();
        expect(eventSource.close).toHaveBeenCalled();
    });

    it('closes and recreates EventSource when URL changes', () => {
        const initialUrl = '/api/events';
        const newUrl = '/api/other-events';
        const { result, rerender } = renderHook(
            (url: string) => useEventSource(url),
            { initialProps: initialUrl }
        );

        const initialEventSource = result.current as unknown as MockEventSource;

        // Change URL
        rerender(newUrl);

        expect(initialEventSource.close).toHaveBeenCalled();
        expect(result.current?.url).toBe(newUrl);
    });
}); 