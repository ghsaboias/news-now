interface ProgressProps {
  /** Current progress value (0-100) */
  value?: number;
  /** Current stage of processing */
  stage?: string;
  /** Additional status text */
  status?: string;
  /** Whether there's an error */
  error?: string;
  /** CSS class name */
  className?: string;
}

/**
 * Progress indicator with stages and error handling
 */
export function Progress({
  value = 0,
  stage,
  status,
  error,
  className = ''
}: ProgressProps) {
  return (
    <div
      className={`space-y-3 ${className}`}
      role="status"
      aria-label={`${stage} - ${value}% complete`}
    >
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-200">{stage}</span>
        <span className="text-gray-400">{value}%</span>
      </div>

      <div
        className="h-2 bg-gray-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full transition-all duration-DEFAULT ${error ? 'bg-error-500' :
            value === 100 ? 'bg-success-500' :
              'bg-blue-600'
            }`}
          style={{ width: `${value}%` }}
        />
      </div>

      {status && (
        <div className="text-sm text-gray-400">{status}</div>
      )}

      {error && (
        <div className="text-sm text-error-500">{error}</div>
      )}
    </div>
  );
} 