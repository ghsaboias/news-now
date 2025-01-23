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
  disabled = false,
  className = ''
}: MinMessagesInputProps) {
  return (
    <div className={className}>
      <label 
        htmlFor="minMessages" 
        className="block text-sm font-medium text-gray-300 mb-2"
      >
        Minimum Messages
      </label>
      <input
        id="minMessages"
        type="number"
        min="1"
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        disabled={disabled}
        className="
          w-full p-3 bg-gray-800/80 text-gray-50 rounded-lg
          border border-gray-700 focus:border-blue-500
          transition-colors duration-DEFAULT focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      />
    </div>
  );
} 