import { RefreshCw } from 'react-feather';
import { Button } from '../Button';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 bg-red-900/20 rounded-lg border border-red-500/20">
      <div className="text-red-400">{message}</div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="danger"
          icon={<RefreshCw />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
} 