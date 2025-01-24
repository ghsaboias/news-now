import { useEffect } from 'react';

// Chrome Performance Memory API types
declare global {
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
        }
    }
}

interface PerformanceMonitorOptions {
    logMemory?: boolean;
    logRenderCount?: boolean;
    logMountTime?: boolean;
}

export function usePerformanceMonitor(componentName: string, options: PerformanceMonitorOptions = {}) {
    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return;

        const start = performance.now();
        console.time(`⏱️ ${componentName} mount`);
        performance.mark(`${componentName}-mount-start`);

        if (options.logMemory && performance.memory) {
            console.log(`📊 Memory at ${componentName} mount:`, {
                usedHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                totalHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
            });
        }

        return () => {
            const end = performance.now();
            if (options.logMountTime) {
                console.timeEnd(`⏱️ ${componentName} mount`);
                performance.mark(`${componentName}-mount-end`);
                performance.measure(componentName, `${componentName}-mount-start`, `${componentName}-mount-end`);

                console.log(`📈 ${componentName} stats:`, {
                    mountDurationMs: Math.round(end - start)
                });
            }
        };
    }, [componentName, options.logMemory, options.logMountTime]);
} 