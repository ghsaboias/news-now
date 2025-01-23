import { ReactNode } from 'react';

interface GridProps {
  /** Grid content */
  children: ReactNode;
  /** Number of columns at different breakpoints */
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
  /** Minimum width for each child (enables auto-fit grid) */
  minChildWidth?: string;
  /** Space between items */
  spacing?: 'tight' | 'default' | 'relaxed';
  /** Additional CSS classes */
  className?: string;
}

const spacingStyles = {
  tight: 'gap-2',     // 8px  - Tight spacing
  default: 'gap-4',   // 16px - Default spacing
  relaxed: 'gap-6'    // 24px - Relaxed spacing
} as const;

/**
 * Grid component for consistent grid layouts
 * 
 * @example
 * ```tsx
 * // Responsive grid with fixed columns
 * <Grid columns={{ sm: 1, md: 2, lg: 3 }}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 * </Grid>
 * 
 * // Auto-fit grid with minimum child width
 * <Grid minChildWidth="16rem">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 * </Grid>
 * ```
 */
export function Grid({
  children,
  columns,
  minChildWidth,
  spacing = 'default',
  className = ''
}: GridProps) {
  // Auto-fit grid based on minimum child width
  if (minChildWidth) {
    return (
      <div
        className={`
          grid
          ${spacingStyles[spacing]}
          ${className}
        `}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${minChildWidth}, 1fr))`
        }}
      >
        {children}
      </div>
    );
  }

  // Responsive grid with fixed columns
  const cols = columns || { sm: 1, md: 2, lg: 3 };
  const gridCols = [
    `grid-cols-${cols.sm || 1}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`
  ].filter(Boolean).join(' ');

  return (
    <div
      className={`
        grid
        ${gridCols}
        ${spacingStyles[spacing]}
        ${className}
      `}
    >
      {children}
    </div>
  );
} 