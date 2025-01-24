import '@testing-library/jest-dom';

// Extend global for test environment
declare global {
    // Allow overriding EventSource in tests
    // eslint-disable-next-line no-var
    var EventSource: {
        new(url: string | URL, eventSourceInitDict?: EventSourceInit): EventSource;
        prototype: EventSource;
        readonly CONNECTING: 0;
        readonly OPEN: 1;
        readonly CLOSED: 2;
    };
}

// Define event data type
type EventData = {
    type: string;
    [key: string]: unknown;
};

// Mock EventSource for useEventSource tests
class MockEventSource implements EventSource {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;

    readonly CONNECTING = MockEventSource.CONNECTING;
    readonly OPEN = MockEventSource.OPEN;
    readonly CLOSED = MockEventSource.CLOSED;

    readyState: number = MockEventSource.CONNECTING;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    url: string;
    withCredentials: boolean = false;

    constructor(url: string | URL, _eventSourceInitDict?: EventSourceInit) {
        this.url = url.toString();
    }

    close = jest.fn(() => {
        this.readyState = MockEventSource.CLOSED;
    });

    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    dispatchEvent = jest.fn(() => true);

    // Helper methods for testing
    simulateMessage(data: EventData) {
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

// Create constructor function that matches EventSource signature
const MockEventSourceConstructor = MockEventSource as unknown as typeof global.EventSource;
Object.defineProperties(MockEventSourceConstructor, {
    CONNECTING: { value: MockEventSource.CONNECTING },
    OPEN: { value: MockEventSource.OPEN },
    CLOSED: { value: MockEventSource.CLOSED }
});

// Assign to global
global.EventSource = MockEventSourceConstructor;

// Mock performance API
const performanceObject = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
        jsHeapSizeLimit: 2330000000,
        totalJSHeapSize: 27000000,
        usedJSHeapSize: 25000000
    }
}; 