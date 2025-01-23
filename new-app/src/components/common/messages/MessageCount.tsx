/**
 * Displays a message count for a specific time period
 * 
 * @example
 * ```tsx
 * // With data
 * <MessageCount period="1h" count={5} />
 * 
 * // Loading state
 * <MessageCount period="4h" isLoading />
 * 
 * // Empty state
 * <MessageCount period="24h" />
 * ```
 */
interface MessageCount {
  /** Time period for the message count */
  period: '1h' | '4h' | '24h';
  /** Number of messages in the period */
  count?: number;
  /** Whether the count is loading */
  isLoading?: boolean;
}

export function MessageCount({ period, count, isLoading = false }: MessageCount) {
  const hasData = count !== undefined;

  return (
    <span 
      className={`
        flex items-center justify-between
        px-3 sm:px-3.5 
        py-2 sm:py-1.5
        text-sm
        rounded-lg sm:rounded-full 
        sm:min-w-[120px]
        transition-all duration-200
        touch-manipulation
        ${isLoading ? 'bg-gray-700/50 animate-pulse border border-gray-600/50' : 
          hasData ? 'bg-gray-700/50 border border-gray-600' : 
          'bg-transparent border border-gray-600/50'
        }
      `}
    >
      <span className="flex items-center gap-2">
        <span className={`
          font-mono text-base sm:text-sm
          ${isLoading ? 'text-gray-200' : 
            hasData ? 'text-gray-50' : 'text-gray-200'
          }
        `}>
          {isLoading ? '...' : (count ?? 0)}
        </span>
        <span className="text-gray-200 text-xs">msgs</span>
      </span>
      <span className="text-gray-200 text-xs">{period}</span>
    </span>
  );
} 