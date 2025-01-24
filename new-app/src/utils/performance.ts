interface PerformanceMetric {
    operation: string;
    duration: number;
    metadata?: Record<string, any>;
}

class PerformanceTracker {
    private static metrics: PerformanceMetric[] = [];
    private static MAX_METRICS = 1000; // Prevent memory leaks

    static track<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
    static track<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T;
    static track<T>(operation: string, fn: (() => T) | (() => Promise<T>), metadata?: Record<string, any>): T | Promise<T> {
        const start = performance.now();

        try {
            const result = fn();

            if (result instanceof Promise) {
                return result.finally(() => {
                    this.addMetric(operation, start, metadata);
                });
            }

            this.addMetric(operation, start, metadata);
            return result;
        } catch (error) {
            this.addMetric(operation, start, { ...metadata, error: true });
            throw error;
        }
    }

    private static addMetric(operation: string, startTime: number, metadata?: Record<string, any>) {
        const duration = performance.now() - startTime;

        this.metrics.push({
            operation,
            duration,
            metadata
        });

        // Keep only last MAX_METRICS entries
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }

        // Log significant operations (over 100ms)
        if (duration > 100) {
            console.log(
                `[Performance] ${operation}: ${duration.toFixed(1)}ms`,
                metadata ? `| ${JSON.stringify(metadata)}` : ''
            );
        }
    }

    static getMetrics(operation?: string): PerformanceMetric[] {
        if (operation) {
            return this.metrics.filter(m => m.operation === operation);
        }
        return this.metrics;
    }

    static getAverages(): Record<string, number> {
        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};

        this.metrics.forEach(({ operation, duration }) => {
            sums[operation] = (sums[operation] || 0) + duration;
            counts[operation] = (counts[operation] || 0) + 1;
        });

        return Object.entries(sums).reduce((acc, [operation, sum]) => ({
            ...acc,
            [operation]: sum / counts[operation]
        }), {});
    }

    static clear() {
        this.metrics = [];
    }
}

export { PerformanceTracker };
