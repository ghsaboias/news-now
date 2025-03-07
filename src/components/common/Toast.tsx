import { useEffect } from 'react';
import { AlertCircle, Check, X } from 'react-feather';

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: 'success' | 'error';
  duration?: number;
}

export function Toast({
  message,
  onClose,
  type = 'success',
  duration = type === 'error' ? 5000 : 3000
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const Icon = type === 'success' ? Check : AlertCircle;
  const iconColor = type === 'success' ? 'text-emerald-400' : 'text-red-400';
  const bgColor = type === 'success' ? 'bg-gray-800/95' : 'bg-red-900/95';
  const borderColor = type === 'success' ? 'border-gray-600/50' : 'border-red-800/50';

  return (
    <div className={`
      fixed bottom-4 right-4 
      flex items-center gap-3 px-4 py-3
      ${bgColor}
      text-gray-50
      rounded-lg 
      border ${borderColor}
      shadow-lg
      backdrop-blur-md
      transition-all duration-200
      animate-in fade-in slide-in-from-bottom-4
    `}>
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="
          ml-2 p-1.5
          text-gray-400
          hover:text-gray-50
          hover:bg-gray-700/50
          active:bg-gray-600
          rounded-full 
          transition-colors duration-200
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-blue-500
          focus-visible:ring-offset-2
          focus-visible:ring-offset-gray-800
        "
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
} 