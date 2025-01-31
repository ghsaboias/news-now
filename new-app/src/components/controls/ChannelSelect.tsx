import { DiscordChannel } from '@/types/discord';
import { useCallback, useEffect, useMemo } from 'react';

interface ChannelSelectProps {
  channels: DiscordChannel[];
  selectedChannelId: string;
  onSelect: (channelId: string, isValid: boolean) => void;
  disabled?: boolean;
}

interface ChannelValidationError {
  type: 'invalid_channel' | 'not_found' | 'disabled';
  message: string;
}

export function ChannelSelect({
  channels,
  selectedChannelId,
  onSelect,
  disabled = false
}: ChannelSelectProps) {
  // Memoize the channel map for quick lookups
  const channelMap = useMemo(() => {
    return channels.reduce((acc, channel) => {
      acc[channel.id] = channel;
      return acc;
    }, {} as Record<string, DiscordChannel>);
  }, [channels]);

  // Validate channel selection
  const validateChannel = useCallback((channelId: string): ChannelValidationError | null => {
    if (!channelId) return null; // Empty selection is valid

    const channel = channelMap[channelId];
    if (!channel) {
      return {
        type: 'not_found',
        message: `Channel ${channelId} not found`
      };
    }

    return null;
  }, [channelMap]);

  // Effect to validate current selection
  useEffect(() => {
    const error = validateChannel(selectedChannelId);
    if (error) {
      console.error('Channel validation error:', error);
      onSelect('', false); // Clear invalid selection
    }
  }, [selectedChannelId, validateChannel, onSelect]);

  // Handle selection change
  const handleSelect = useCallback((channelId: string) => {
    const error = validateChannel(channelId);
    if (error) {
      console.error('Channel validation error:', error);
      onSelect('', false);
      return;
    }
    onSelect(channelId, true);
  }, [validateChannel, onSelect]);

  return (
    <div className="w-full">
      <div className="relative">
        <select
          value={selectedChannelId}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={disabled}
          className="
            w-full px-4 py-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-white
            appearance-none cursor-pointer transition-colors
            hover:bg-gray-700 hover:border-gray-600
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            aria-invalid:border-red-500 aria-invalid:focus:border-red-500
          "
          aria-invalid={!!validateChannel(selectedChannelId)}
        >
          <option value="">Select a channel</option>
          {channels.map((channel) => (
            <option
              key={channel.id}
              value={channel.id}
              className="bg-gray-800"
              disabled={channel.archived} // Example of channel-specific validation
            >
              {channel.name}
              {channel.archived ? ' (Archived)' : ''}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {validateChannel(selectedChannelId) && (
        <p className="mt-2 text-sm text-red-500">
          {validateChannel(selectedChannelId)?.message}
        </p>
      )}
    </div>
  );
} 