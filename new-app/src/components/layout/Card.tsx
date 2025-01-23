import { ReactNode } from 'react';
import { MessageCount } from '../common/messages/MessageCount';
import { Stack } from './Stack';

interface MessageCounts {
  '1h'?: number;
  '4h'?: number;
  '24h'?: number;
}

interface CardProps {
  /** Card title */
  title: string;
  /** Card content */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Message counts for different time periods */
  messageCounts?: MessageCounts;
  /** Set of periods currently loading */
  loadingPeriods?: Set<string>;
  /** Whether the card is interactive (clickable) */
  interactive?: boolean;
  /** Click handler for interactive cards */
  onClick?: () => void;
}

export function Card({ 
  title, 
  children, 
  className = '', 
  messageCounts, 
  loadingPeriods = new Set(),
  interactive = false,
  onClick
}: CardProps) {
  const periods = ['1h', '4h', '24h'] as const;
  
  return (
    <div 
      className={`
        bg-gray-800 
        border border-gray-600/50
        rounded-lg 
        p-4 lg:p-6
        transition-colors duration-DEFAULT
        ${interactive ? `
          hover:bg-gray-700
          hover:border-gray-600
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-blue-500
          focus-visible:ring-offset-2
          focus-visible:ring-offset-gray-900
          cursor-pointer
        ` : ''}
        ${className}
      `}
      onClick={interactive ? onClick : undefined}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
    >
      <Stack spacing="relaxed">
        <Stack spacing="default">
          <h2 className="text-base sm:text-lg font-medium text-gray-50 leading-snug">
            {title}
          </h2>
          
          {/* Mobile: Vertical stack, Tablet+: Horizontal with wrap */}
          <Stack spacing="default">
            {periods.map((period) => (
              <MessageCount
                key={period}
                period={period}
                count={messageCounts?.[period]}
                isLoading={loadingPeriods.has(period)}
              />
            ))}
          </Stack>
        </Stack>

        {children && (
          <div className="text-sm sm:text-base text-gray-200 leading-normal">
            {children}
          </div>
        )}
      </Stack>
    </div>
  );
} 