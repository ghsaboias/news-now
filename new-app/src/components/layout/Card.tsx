import { ReactNode } from 'react';

interface MessageCounts {
  '1h'?: number;
  '4h'?: number;
  '24h'?: number;
}

interface CardProps {
  title: string;
  children?: ReactNode;
  className?: string;
  messageCounts?: MessageCounts;
  loadingPeriods?: Set<string>;
}

export function Card({ title, children, className = '', messageCounts, loadingPeriods = new Set() }: CardProps) {
  const periods = ['1h', '4h', '24h'];
  
  return (
    <div className={`rounded-lg border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-4 ${className}`}>
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {periods.map((period) => {
            const isLoading = loadingPeriods.has(period);
            const count = messageCounts?.[period as keyof MessageCounts];
            const hasData = count !== undefined;

            return (
              <span 
                key={period}
                className={`px-2 py-0.5 text-sm rounded-full flex items-center gap-1 transition-colors ${
                  isLoading ? 'bg-gray-800/40 animate-pulse' : 
                  hasData ? 'bg-gray-800/80' : 'bg-gray-800/20'
                }`}
              >
                <span className={`font-medium transition-colors ${
                  isLoading ? 'text-gray-500' : 
                  hasData ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {isLoading ? '...' : (count ?? 0)}
                </span>
                <span className="text-gray-400 text-xs">msgs/{period}</span>
              </span>
            );
          })}
        </div>
      </div>
      {children && <div className="text-gray-300 mt-2">{children}</div>}
    </div>
  );
} 