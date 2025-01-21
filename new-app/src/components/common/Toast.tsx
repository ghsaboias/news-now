import { useEffect } from 'react';
import { Check, X } from 'react-feather';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg border border-gray-700 animate-slide-up">
      <Check className="w-4 h-4 text-green-400" />
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 hover:bg-gray-700 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
} 