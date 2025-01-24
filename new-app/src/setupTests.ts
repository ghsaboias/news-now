import '@testing-library/jest-dom';

// Mock EventSource for useEventSource tests
class MockEventSource {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    close = jest.fn();

    constructor(public url: string) { }

    // Helper methods for testing
    simulateMessage(data: any) {
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

// Mock global EventSource
(global as any).EventSource = MockEventSource; 