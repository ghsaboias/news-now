import { ReactNode } from 'react';

interface StackProps {
  /** Stack content */
  children: ReactNode;
  /** Stack direction */
  direction?: 'horizontal' | 'vertical';
  /** Space between items */
  spacing?: 'tight' | 'default' | 'relaxed';
  /** Whether items should wrap to next line (only applies to horizontal stacks) */
  wrap?: boolean;
  /** Whether to add a divider between items */
  divider?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** HTML element to render as */
  as?: 'div' | 'section' | 'ul' | 'ol';
}

const spacingStyles = {
  tight: 'gap-2',     // 8px  - Tight spacing (buttons, badges)
  default: 'gap-3',   // 12px - Default spacing (form fields)
  relaxed: 'gap-4'    // 16px - Relaxed spacing (cards, sections)
} as const;

/**
 * Stack component for consistent vertical/horizontal layouts
 * 
 * @example
 * ```tsx
 * // Vertical stack (default)
 * <Stack spacing="default">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Stack>
 * 
 * // Horizontal stack with wrapping
 * <Stack direction="horizontal" spacing="tight" wrap>
 *   <Button>Action 1</Button>
 *   <Button>Action 2</Button>
 * </Stack>
 * ```
 */
export function Stack({
  children,
  direction = 'vertical',
  spacing = 'default',
  wrap = false,
  divider = false,
  className = '',
  as: Component = 'div'
}: StackProps) {
  return (
    <Component
      className={`
        flex
        ${direction === 'horizontal' ? 'flex-row' : 'flex-col'}
        ${wrap ? 'flex-wrap' : ''}
        ${spacingStyles[spacing]}
        ${divider ? 'divide-gray-700' : ''}
        ${direction === 'horizontal' ? 'divide-x' : 'divide-y'}
        ${className}
      `}
    >
      {children}
    </Component>
  );
} 