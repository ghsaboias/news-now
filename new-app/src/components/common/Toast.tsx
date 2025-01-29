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
    <div className="
      fixed bottom-4 right-4 
      flex items-center gap-3 px-4 py-3
      bg-gray-800/95
      text-gray-50
      rounded-lg 
      border border-gray-600/50
      shadow-lg
      backdrop-blur-md
      transition-all duration-DEFAULT
      animate-[fade-in_5s_ease-out,fade-out_5s_ease-in_forwards]
      motion-reduce:animate-none
    ">
      <Check className="w-4 h-4 text-emerald-400" />
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
          transition-colors duration-DEFAULT
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