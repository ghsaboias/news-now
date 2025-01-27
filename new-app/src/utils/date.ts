/**
 * Format a timestamp in a consistent way that won't cause hydration issues
 * by using UTC timezone and fixed locale
 */
export function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: undefined
    });
}

export function formatReportDate(date: string) {
    const d = new Date(date);
    return {
        full: d.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'  // Keep date in UTC to avoid day changes
        }),
        time: d.toLocaleTimeString(undefined, {  // Use system locale
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZoneName: undefined  // Don't show timezone
        })
    };
}