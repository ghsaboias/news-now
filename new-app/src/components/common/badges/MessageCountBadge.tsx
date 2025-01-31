import { Badge } from '@/components/ui/badge';

interface MessageCountBadgeProps {
  /** Number of messages */
  count: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a message count in a warning-styled badge
 * 
 * @example
 * ```tsx
 * <MessageCountBadge count={5} />
 * ```
 */
export function MessageCountBadge({ count, className }: MessageCountBadgeProps) {
  return (
    <Badge
      variant="success"
      title={`${count} messages processed`}
      className={className}
    >
      {count} msgs
    </Badge>
  );
} 