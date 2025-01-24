import { Button } from '@/components/common/Button';

export type TimeframeValue = '1h' | '4h' | '24h';

export interface TimeframeOption {
  value: TimeframeValue;
  label: string;
}

export interface TimeSelectProps {
  /** Currently selected timeframe */
  value: TimeframeValue;
  /** Called when selection changes */
  onChange: (value: TimeframeValue) => void;
  /** Available timeframe options */
  options: TimeframeOption[];
  /** Disabled state */
  disabled: boolean;
}

/**
 * Time range selector with multiple options
 * 
 * @example
 * ```tsx
 * <TimeSelect
 *   value="1h"
 *   onChange={setTimeframe}
 *   options={[
 *     { value: '1h', label: 'Last Hour' },
 *     { value: '4h', label: 'Last 4 Hours' },
 *     { value: '24h', label: 'Last 24 Hours' },
 *   ]}
 *   disabled={false}
 * />
 * ```
 */
export function TimeSelect({ value, onChange, options, disabled }: TimeSelectProps) {
  return (
    <div role="group" className="w-full">
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            variant={value === option.value ? 'primary' : 'secondary'}
            size="sm"
            fullWidth
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
} 