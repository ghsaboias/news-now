import { Loader } from 'react-feather';

interface GenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function GenerateButton({
  onClick,
  disabled = false,
  loading = false
}: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium
                hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          <span>Processing...</span>
        </div>
      ) : (
        'Create Report'
      )}
    </button>
  );
} 