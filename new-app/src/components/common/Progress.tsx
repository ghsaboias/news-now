interface ProgressProps {
  /** Current step description */
  step: string;
  /** Progress percentage (0-100) */
  percent?: number;
  /** Optional message count */
  messageCount?: number;
}

/**
 * Progress indicator with step description and optional progress bar
 * 
 * @example
 * ```tsx
 * <Progress 
 *   step="Fetching messages" 
 *   percent={45}
 *   messageCount={100}
 * />
 * ```
 */
export function Progress({ step, percent, messageCount }: ProgressProps) {
  const ariaLabel = `${step}${messageCount ? ` - ${messageCount} messages` : ''}${percent !== undefined ? ` - ${percent}% complete` : ''}`;

  return (
    <div className="space-y-3" role="status" aria-label={ariaLabel}>
      <div className="flex justify-between text-sm text-gray-400">
        <span>
          {step}
          {messageCount ? ` (${messageCount} messages)` : ''}
        </span>
        {percent !== undefined && (
          <span className="text-gray-300">{Math.round(percent)}%</span>
        )}
      </div>
      {percent !== undefined && (
        <div 
          className="h-1 bg-gray-700/50 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div 
            className="h-full bg-blue-600 transition-all duration-DEFAULT ease-out"
            style={{ width: `${Math.round(percent)}%` }}
          />
        </div>
      )}
    </div>
  );
} 