import { useDisclosure } from '@/hooks/useDisclosure';
import { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'react-feather';
import { Button } from '../common/Button';
import { Stack } from './Stack';

interface SectionProps {
  /** Section content */
  children: ReactNode;
  /** Section title */
  title?: ReactNode;
  /** Whether the section is collapsible */
  collapsible?: boolean;
  /** Initial expanded state (only applies when collapsible is true) */
  defaultExpanded?: boolean;
  /** Space between items */
  spacing?: 'tight' | 'default' | 'relaxed';
  /** Whether to show a divider between title and content */
  divider?: boolean;
  /** Visual style variant */
  variant?: 'surface' | 'raised';
  /** Additional CSS classes */
  className?: string;
}

const variantStyles = {
  surface: 'bg-gray-800/50',
  raised: 'bg-gray-700/50 backdrop-blur-sm'
} as const;

/**
 * Section component for consistent section layouts
 * 
 * @example
 * ```tsx
 * // Basic section
 * <Section title="Features">
 *   <p>Feature 1</p>
 *   <p>Feature 2</p>
 * </Section>
 * 
 * // Collapsible section
 * <Section title="Advanced Options" collapsible defaultExpanded={false}>
 *   <p>Option 1</p>
 *   <p>Option 2</p>
 * </Section>
 * ```
 */
export function Section({
  children,
  title,
  collapsible = false,
  defaultExpanded = true,
  spacing = 'default',
  divider = false,
  variant = 'surface',
  className = ''
}: SectionProps) {
  const { isOpen, onToggle } = useDisclosure(defaultExpanded);
  const showContent = !collapsible || isOpen;

  return (
    <div
      className={`
        rounded-xl
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {title && (
        <div className={divider ? 'border-b border-gray-700' : ''}>
          {collapsible ? (
            <Button
              variant="secondary"
              onClick={onToggle}
              icon={isOpen ? <ChevronUp /> : <ChevronDown />}
              className="w-full justify-between !p-4"
            >
              <span className="text-sm font-medium">{title}</span>
            </Button>
          ) : (
            <div className="p-4">
              <span className="text-sm font-medium">{title}</span>
            </div>
          )}
        </div>
      )}

      {showContent && (
        <Stack spacing={spacing} className="p-4">
          {children}
        </Stack>
      )}
    </div>
  );
} 