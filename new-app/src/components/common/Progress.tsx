interface ProgressProps {
  /** Current progress value (0-100) */
  value?: number;
  /** Current stage of processing */
  stage?: string;
  /** Additional status text */
  status?: string;
  /** Whether there's an error */
  error?: string;
  /** Number of messages processed */
  messageCount?: number;
  /** CSS class name */
  className?: string;
}

const stageLabels = {
  setup: 'Setting up',
  fetching: 'Fetching messages',
  processing: 'Processing'
};

/**
 * Progress indicator with stages and error handling
 */
export function Progress({
  value = 0,
  stage,
  status,
  error,
  messageCount,
  className = ''
}: ProgressProps) {
  const stageLabel = stage ? stageLabels[stage as keyof typeof stageLabels] || stage : 'Processing';
  const statusMessage = `${stageLabel}${messageCount ? ` - ${messageCount} messages` : ''} - ${value}% complete`;
  
  return (
    <div 
      className={`space-y-3 ${className}`}
      role="status"
      aria-label={statusMessage}
    >
      <div className="flex justify-between text-sm text-gray-400">
        <div>{stageLabel}</div>
        <div>{value}%</div>
      </div>
      <div 
        className="h-2 bg-gray-700/50 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-blue-600 transition-all duration-DEFAULT ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      {messageCount && (
        <div className="text-sm text-gray-400">
          ({messageCount} messages)
        </div>
      )}
      {status && (
        <div className="text-sm text-gray-400">{status}</div>
      )}
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
} 