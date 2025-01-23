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

  const isLoading = loadingPeriods.size > 0;
  
  return (
    <div className={`
      rounded-lg 
      border ${isLoading ? 'border-gray-600' : 'border-gray-500'}
      bg-gradient-to-b from-[var(--card-bg)] to-[color-mix(in_srgb,var(--card-bg),#000_8%)]
      p-4 sm:p-5 lg:p-6
      transition-all duration-200
      hover:bg-[var(--card-hover)]
      hover:border-[var(--accent)]/20
      hover:shadow-lg hover:shadow-[var(--card-shadow)]
      hover:-translate-y-0.5
      ${className}
    `}>
      <div className="flex flex-col gap-3 sm:gap-4">
        <h3 className="text-base sm:text-lg font-medium text-[var(--text-primary)] min-h-[1.5rem]">{title}</h3>
        
        {/* Mobile: Vertical stack, Tablet+: Horizontal with wrap */}
        <div className="flex flex-col gap-2 sm:gap-2.5">
          {periods.map((period) => {
            const isLoading = loadingPeriods.has(period);
            const count = messageCounts?.[period as keyof MessageCounts];
            const hasData = count !== undefined;

            return (
              <span 
                key={period}
                className={`
                  flex items-center justify-between
                  px-3 sm:px-3.5 
                  py-2 sm:py-1.5
                  text-sm
                  rounded-lg sm:rounded-full 
                  sm:min-w-[120px]
                  transition-colors
                  touch-manipulation
                  ${isLoading ? 'bg-[var(--pill-bg)] animate-pulse border border-gray-600' : 
                    hasData ? 'bg-[var(--pill-bg)] border border-[var(--border-color)]' : 
                    'bg-transparent border border-[var(--border-color)]'
                  }
                `}
              >
                <span className="flex items-center gap-2">
                  <span className={`
                    font-mono text-base sm:text-sm
                    ${isLoading ? 'text-[var(--text-secondary)]' : 
                      hasData ? 'text-[var(--pill-text)]' : 'text-[var(--text-secondary)]'
                    }
                  `}>
                    {isLoading ? '...' : (count ?? 0)}
                  </span>
                  <span className="text-[var(--text-secondary)] text-xs">msgs</span>
                </span>
                <span className="text-[var(--text-secondary)] text-xs">{period}</span>
              </span>
            );
          })}
        </div>
      </div>
      {children && (
        <div className="text-[var(--text-secondary)] mt-3 sm:mt-4 text-sm">
          {children}
        </div>
      )}
    </div>
  );
} 