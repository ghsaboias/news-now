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

// Mock implementation
const mockEventSourceClass = jest.fn().mockImplementation((url: string) => {
    return new MockEventSource(url);
});

// Replace global EventSource with mock
(global as any).EventSource = mockEventSourceClass;

describe('useEventSource', () => {
    let eventSource: MockEventSource;

    beforeEach(() => {
        mockEventSourceClass.mockClear();
    });

    it('creates EventSource with provided URL', () => {
        const url = '/api/events';
        renderHook(() => useEventSource(url));
        expect(mockEventSourceClass).toHaveBeenCalledWith(url);
    });

    it('handles messages', () => {
        const onMessage = jest.fn();
        renderHook(() => useEventSource('/api/events', { onMessage }));
        eventSource = mockEventSourceClass.mock.results[0].value;

        const testData = { type: 'test', value: 123 };
        eventSource.simulateMessage(testData);

        expect(onMessage).toHaveBeenCalledWith(expect.any(MessageEvent));
        expect(JSON.parse(onMessage.mock.calls[0][0].data)).toEqual(testData);
    });

    it('handles errors', () => {
        const onError = jest.fn();
        renderHook(() => useEventSource('/api/events', { onError }));
        eventSource = mockEventSourceClass.mock.results[0].value;

        eventSource.simulateError();

        expect(onError).toHaveBeenCalledWith(expect.any(Event));
    });

    it('handles open events', () => {
        const onOpen = jest.fn();
        renderHook(() => useEventSource('/api/events', { onOpen }));
        eventSource = mockEventSourceClass.mock.results[0].value;

        eventSource.simulateOpen();

        expect(onOpen).toHaveBeenCalledWith(expect.any(Event));
    });

    it('closes EventSource on unmount', () => {
        const { unmount } = renderHook(() => useEventSource('/api/events'));
        eventSource = mockEventSourceClass.mock.results[0].value;

        unmount();
        expect(eventSource.close).toHaveBeenCalled();
    });

    it('closes and recreates EventSource when URL changes', () => {
        const initialUrl = '/api/events';
        const newUrl = '/api/events/new';
        const { rerender } = renderHook(
            (url: string) => useEventSource(url),
            { initialProps: initialUrl }
        );

        const initialEventSource = mockEventSourceClass.mock.results[0].value;
        rerender(newUrl);

        expect(initialEventSource.close).toHaveBeenCalled();
        expect(mockEventSourceClass).toHaveBeenCalledWith(newUrl);
    });
}); 