import { renderHook } from '@testing-library/react';
import { useEventSource } from '../useEventSource';

interface MockEventData {
    type: string;
    data?: unknown;
    error?: string;
    status?: string;
    progress?: number;
}

class MockEventSource implements EventSource {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    readyState: number = 0;
    url: string;
    withCredentials: boolean = false;
    CONNECTING: 0 = 0;
    OPEN: 1 = 1;
    CLOSED: 2 = 2;

    close = jest.fn();
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    dispatchEvent = jest.fn();

    constructor(url: string) {
        this.url = url;
    }

    simulateMessage(data: MockEventData) {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
        }
    }

    simulateError() {
        if (this.onerror) {
            this.onerror(new Event('error'));
        }
    }

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