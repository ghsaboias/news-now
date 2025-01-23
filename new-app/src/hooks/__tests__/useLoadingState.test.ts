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
        const { result } = renderHook(() => useLoadingState());
        const mockFn = jest.fn().mockResolvedValue('success');

        expect(result.current.isLoading).toBe(false);

        const promise = result.current.withLoading(mockFn);
        expect(result.current.isLoading).toBe(true);

        const value = await promise;
        expect(value).toBe('success');
        expect(result.current.isLoading).toBe(false);
    });

    it('handles failed async operations with withLoading', async () => {
        const { result } = renderHook(() => useLoadingState());
        const error = new Error('test error');
        const mockFn = jest.fn().mockRejectedValue(error);

        expect(result.current.isLoading).toBe(false);

        await expect(result.current.withLoading(mockFn)).rejects.toThrow(error);
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
}); 