import { ReactNode } from 'react';

/**
 * Base badge component with consistent styling
 * 
 * @example
 * ```tsx
 * // Info badge
 * <Badge variant="info">New</Badge>
 * 
 * // Success badge
 * <Badge variant="success">Done</Badge>
 * 
 * // Warning badge
 * <Badge variant="warning">5 msgs</Badge>
 * ```
 */
interface BadgeProps {
  /** Badge content */
  children: ReactNode;
  /** Visual style variant */
  variant?: 'info' | 'success' | 'warning';
  /** Optional title for hover tooltip */
  title?: string;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles = {
  info: 'bg-blue-500/20 text-blue-400',
  success: 'bg-emerald-500/20 text-emerald-400',
  warning: 'bg-amber-500/20 text-amber-400'
} as const;

export function Badge({ 
  children, 
  variant = 'info',
  title,
  className = '' 
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center 
        px-2 py-1 
        rounded 
        text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
      title={title}
    >
      {children}
    </span>
  );
} 