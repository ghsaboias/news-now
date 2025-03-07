'use client';

import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface Toast {
  text: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastContextType {
  showToast: (message: string | Toast) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string | Toast) => {
    const toastData = typeof message === 'string' ? { text: message } : message;
    setToast(toastData);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast UI */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`
                        px-4 py-2 rounded-lg shadow-lg
                        ${toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'success' ? 'bg-green-500' :
                'bg-blue-500'} 
                        text-white
                    `}>
            {toast.text}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
