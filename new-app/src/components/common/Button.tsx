import { ReactNode } from 'react';
import { Loader } from 'react-feather';

interface ButtonProps {
  /** Button content */
  children: ReactNode;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional icon to show before text */
  icon?: ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Optional title for hover tooltip */
  title?: string;
}

const variantStyles = {
  primary: `
    bg-blue-600 text-gray-50
    hover:bg-blue-700
    focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
    focus:outline-none
    disabled:bg-blue-600/50
  `,
  secondary: `
    bg-gray-700/50 text-gray-200
    hover:bg-gray-700 hover:text-gray-50
    focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
    focus:outline-none
    disabled:bg-gray-700/25
  `,
  danger: `
    bg-gray-700/50 text-error-500
    hover:bg-gray-700 hover:text-error-400
    focus-visible:ring-2 focus-visible:ring-error-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
    focus:outline-none
    disabled:bg-gray-700/25
  `
} as const;

const sizeStyles = {
  sm: 'p-2 text-sm gap-2 rounded-md',
  md: 'p-3 text-sm gap-3 rounded-lg',
  lg: 'p-4 text-base gap-3 rounded-lg'
} as const;

/**
 * Base button component with consistent styling
 * 
 * @example
 * ```tsx
 * // Primary button (medium size)
 * <Button variant="primary">Create Report</Button>
 * 
 * // Secondary button with icon (small size)
 * <Button variant="secondary" size="sm" icon={<RefreshCw />}>Retry</Button>
 * 
 * // Large primary button
 * <Button variant="primary" size="lg">Get Started</Button>
 * ```
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  onClick,
  type = 'button',
  title
}: ButtonProps) {
  // Determine which icon to show (loading spinner or provided icon)
  const buttonIcon = loading ? <Loader className="animate-spin" /> : icon;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`
        inline-flex items-center justify-center
        font-medium
        transition-colors duration-DEFAULT
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {buttonIcon && <span className="flex-shrink-0">{buttonIcon}</span>}
      <span>{children}</span>
    </button>
  );
} 