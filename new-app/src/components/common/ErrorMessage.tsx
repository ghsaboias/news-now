import { RefreshCw } from 'react-feather';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 bg-red-900/20 rounded-lg border border-red-500/20">
      <div className="text-red-400">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 bg-red-900/30 hover:bg-red-900/40 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
} 