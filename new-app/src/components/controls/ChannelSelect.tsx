import { DiscordChannel } from '@/types';

interface ChannelSelectProps {
  channels: DiscordChannel[];
  selectedChannelId: string;
  onSelect: (channelId: string) => void;
  disabled?: boolean;
}

export function ChannelSelect({
  channels,
  selectedChannelId,
  onSelect,
  disabled = false
}: ChannelSelectProps) {
  return (
    <div className="w-full">
      <div className="relative">
        <select
          value={selectedChannelId}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className="
            w-full px-4 py-2.5 bg-gray-800/80 border border-gray-700 rounded-lg text-white
            appearance-none cursor-pointer transition-colors
            hover:bg-gray-700 hover:border-gray-600
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <option value="">Select a topic</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id} className="bg-gray-800">
              {channel.name}
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
    </div>
  );
} 