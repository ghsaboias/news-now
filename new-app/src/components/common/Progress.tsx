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
  processing: 'Processing',
  'Initializing': 'Initializing',
  'Fetching messages': 'Fetching messages',
  'Analyzing messages': 'Analyzing messages',
  'Generating summary': 'Generating summary',
  'Saving report': 'Saving report',
  'Complete': 'Complete',
  'Error generating report': 'Error generating report',
  'No messages found': 'No messages found'
};

/**
 * Progress indicator with stages and error handling
 */
export function Progress({
  value = 0,
  stage,
  status,
  error,
  messageCount = 0,
  className = ''
}: ProgressProps) {
  console.log('Progress component props:', { value, stage, messageCount }); // Debug log
  
  const stageLabel = stage ? stageLabels[stage as keyof typeof stageLabels] || stage : 'Processing';
  const statusMessage = `${stageLabel}${messageCount ? ` - ${messageCount} messages` : ''} - ${value}% complete`;
  
  return (
    <div 
      className={`space-y-3 ${className}`}
      role="status"
      aria-label={statusMessage}
    >
      <div className="flex justify-between text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <span>{stageLabel}</span>
          {messageCount > 0 && (
            <span className="text-xs bg-gray-700/50 px-2 py-0.5 rounded-full">
              {messageCount} messages
            </span>
          )}
        </div>
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
          className={`h-full transition-all duration-DEFAULT ease-out ${
            error ? 'bg-red-600' : 
            value === 100 ? 'bg-green-600' : 
            'bg-blue-600'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
      {status && (
        <div className="text-sm text-gray-400">{status}</div>
      )}
      {error && <div className="text-sm text-red-500">{error}</div>}
    </div>
  );
} 