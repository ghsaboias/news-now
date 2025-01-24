// Fixed test date to use across all tests
export const TEST_DATE = '2024-01-15T12:00:00Z';

// Date mocking utility
export function withFixedDate(fn: () => void) {
    const originalDate = global.Date;
    const mockDate = new Date(TEST_DATE);

    beforeEach(() => {
        global.Date = class extends Date {
            constructor() {
                super();
                return mockDate;
            }
        } as DateConstructor;
    });

    afterEach(() => {
        global.Date = originalDate;
    });
}

// Test isolation utility
export function withCleanEnvironment(fn: () => void) {
    const originalEnv = process.env;
    const originalConsole = console;

    beforeEach(() => {
        jest.resetModules();
        console.error = jest.fn();
        console.warn = jest.fn();
    });

    afterEach(() => {
        process.env = originalEnv;
        console = originalConsole;
    });
}

// Error testing utilities
export const mockNetworkError = new Error('Network error');
export const mockTimeoutError = new Error('Request timed out');
export const mockValidationError = new Error('Invalid data');

export function mockRejectedFetch(error = mockNetworkError) {
    return jest.fn().mockRejectedValue(error);
}

export type EventHandler = (event: Event) => void;

export function mockEventSourceError() {
    return {
        addEventListener: jest.fn((event: string, handler: EventHandler) => {
            if (event === 'error') {
                handler(new Event('error'));
            }
        }),
        removeEventListener: jest.fn(),
        close: jest.fn(),
    };
} 