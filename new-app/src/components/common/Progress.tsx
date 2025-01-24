
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
  setup: 'Setting up...',
  fetching: 'Fetching messages...',
  processing: 'Processing...'
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
  const stageLabel = stage || 'Processing...';
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm text-gray-400">
        <div>{stageLabel}</div>
        <div>{value}%</div>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      {(status || messageCount) && (
        <div className="text-sm text-gray-400">
          {status}
          {messageCount && ` (${messageCount} messages)`}
        </div>
      )}
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
} 