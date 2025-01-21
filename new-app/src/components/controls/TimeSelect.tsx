export interface TimeframeOption {
  value: '1h' | '4h' | '24h';
  label: string;
}

export interface TimeSelectProps {
  value: TimeframeOption['value'];
  onChange: (value: TimeframeOption['value']) => void;
  options: TimeframeOption[];
  disabled?: boolean;
}

export function TimeSelect({ value, onChange, options, disabled = false }: TimeSelectProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Time Range
      </label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`
              w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all
              ${value === option.value
                ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
} 