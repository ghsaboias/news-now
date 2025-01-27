interface MinMessagesInputProps {
  /** Current minimum messages value */
  value: number;
  /** Handler for value changes */
  onChange: (value: number) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Input field for setting minimum message count with validation
 */
export function MinMessagesInput({
  value,
  onChange,
  disabled,
  className = ''
}: MinMessagesInputProps) {
  return (
    <input
      type="number"
      min={1}
      value={value}
      onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
      disabled={disabled}
      className={`
        w-full px-4 py-2 rounded-lg
        bg-gray-800 text-gray-50
        border border-gray-700
        transition-all duration-DEFAULT
        placeholder:text-gray-500
        focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      placeholder="Minimum messages"
    />
  );
} 