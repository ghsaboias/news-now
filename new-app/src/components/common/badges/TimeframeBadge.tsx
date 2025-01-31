import { Badge } from '@/components/ui/badge';
import { Timeframe } from '@/types';

const timeframeVariants: Record<Timeframe['type'], 'default' | 'destructive' | 'outline' | 'secondary' | null | undefined> = {
  '1h': 'default',
  '4h': 'default',
  '24h': 'default',
};

const timeframeLabels: Record<Timeframe['type'], string> = {
  '1h': '1 hour',
  '4h': '4 hours',
  '24h': '24 hours',
};

interface TimeframeBadgeProps {
  /** Timeframe value */
  timeframe: Timeframe['type'];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a timeframe in a color-coded badge
 * 
 * @example
 * ```tsx
 * <TimeframeBadge timeframe="1h" />
 * ```
 */
export function TimeframeBadge({ timeframe, className }: TimeframeBadgeProps) {
  return (
    <Badge
      variant={timeframeVariants[timeframe]}
      title={`Last ${timeframeLabels[timeframe]}`}
      className={className}
    >
      {timeframe}
    </Badge>
  );
} 