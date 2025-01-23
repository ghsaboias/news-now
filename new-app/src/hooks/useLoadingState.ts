import { useCallback, useState } from 'react';

interface UseLoadingStateReturn {
    isLoading: boolean;
    startLoading: () => void;
    endLoading: () => void;
    withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Hook for managing loading state with utility functions
 * 
 * @example
 * ```tsx
 * function LoadingButton() {
 *   const { isLoading, withLoading } = useLoadingState();
 *   
 *   const handleClick = () => {
 *     withLoading(async () => {
 *       await someAsyncOperation();
 *     });
 *   };
 *   
 *   return (
 *     <button disabled={isLoading} onClick={handleClick}>
 *       {isLoading ? 'Loading...' : 'Click Me'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useLoadingState(): UseLoadingStateReturn {
    const [isLoading, setIsLoading] = useState(false);

    const startLoading = useCallback(() => setIsLoading(true), []);
    const endLoading = useCallback(() => setIsLoading(false), []);

    const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
        try {
            startLoading();
            return await fn();
        } finally {
            endLoading();
        }
    }, [startLoading, endLoading]);

    return {
        isLoading,
        startLoading,
        endLoading,
        withLoading
    };
} 