/**
 * Format a timestamp in a consistent way that won't cause hydration issues
 * by using UTC timezone and fixed locale
 */
export function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'  // Force UTC timezone
    }).format(date);
} 