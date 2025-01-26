import { useEffect, useRef } from 'react';

interface UseEventSourceOptions {
    onMessage?: (event: MessageEvent) => void;
    onError?: (error: Event) => void;
    onOpen?: (event: Event) => void;
}

/**
 * Hook for managing Server-Sent Events (SSE) connections
 * 
 * @example
 * function LiveUpdates() {
 *   const [data, setData] = useState<any[]>([]);
 *   
 *   useEventSource('/api/updates', {
 *     onMessage: (event) => {
 *       const newData = JSON.parse(event.data);
 *       setData(prev => [...prev, newData]);
 *     },
 *     onError: () => {
 *       console.error('SSE connection failed');
 *     }
 *   });
 *   
 *   return <div>render data</div>;
 * }
 */
export function useEventSource(url: string | undefined, options: UseEventSourceOptions = {}) {
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!url) {
            return;
        }

        // Create new EventSource instance
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        // Set up event handlers
        if (options.onMessage) {
            eventSource.onmessage = options.onMessage;
        }

        if (options.onError) {
            eventSource.onerror = options.onError;
        }

        if (options.onOpen) {
            eventSource.onopen = options.onOpen;
        }

        // Cleanup on unmount or url change
        return () => {
            eventSource.close();
            eventSourceRef.current = null;
        };
    }, [url, options.onMessage, options.onError, options.onOpen]);

    return eventSourceRef.current;
} 