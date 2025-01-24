import { act, renderHook } from '@testing-library/react';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
    it('initializes with loading false', () => {
        const { result } = renderHook(() => useLoadingState());
        expect(result.current.isLoading).toBe(false);
    });

    it('sets loading state with startLoading and endLoading', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
            result.current.startLoading();
        });
        expect(result.current.isLoading).toBe(true);

        act(() => {
            result.current.endLoading();
        });
        expect(result.current.isLoading).toBe(false);
    });

    it('handles successful async operations with withLoading', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');
        const { result } = renderHook(() => useLoadingState());

        let promise: Promise<string>;
        act(() => {
            promise = result.current.withLoading(mockFn);
        });

        // Loading state should be true immediately after calling withLoading
        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            await promise;
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('handles failed async operations with withLoading', async () => {
        const error = new Error('test error');
        const mockFn = jest.fn().mockRejectedValue(error);
        const { result } = renderHook(() => useLoadingState());

        await act(async () => {
            try {
                await result.current.withLoading(mockFn);
            } catch (e) {
                expect(e).toBe(error);
            }
        });
        expect(result.current.isLoading).toBe(false);
    });

    it('maintains stable function references', () => {
        const { result, rerender } = renderHook(() => useLoadingState());
        const initialFunctions = { ...result.current };

        rerender();

        expect(result.current.startLoading).toBe(initialFunctions.startLoading);
        expect(result.current.endLoading).toBe(initialFunctions.endLoading);
        expect(result.current.withLoading).toBe(initialFunctions.withLoading);
    });

    it('provides manual loading state control', () => {
        const { result } = renderHook(() => useLoadingState());

        act(() => {
            result.current.startLoading();
        });
        expect(result.current.isLoading).toBe(true);

        act(() => {
            result.current.endLoading();
        });
        expect(result.current.isLoading).toBe(false);
    });
}); 