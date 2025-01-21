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
    <div>
      <label className="block text-sm font-medium text-gray-400">
        Time Range
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`rounded-full px-4 py-1 text-sm font-medium transition-colors ${
              value === option.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
} 