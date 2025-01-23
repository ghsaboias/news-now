import { ChannelActivity } from '@/types';
import { Loader } from 'react-feather';

interface ChannelListProps {
  /** List of channels with their activity status */
  channels: ChannelActivity[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a list of channels with their processing status and message count
 */
export function ChannelList({ channels, className = '' }: ChannelListProps) {
  if (channels.length === 0) {
    return null;
  }

  return (
    <div 
      className={`space-y-2 ${className}`}
      role="list"
    >
      {channels.map((channel) => (
        <div 
          key={channel.channelId}
          className="
            flex items-center justify-between
            p-2 rounded-lg
            bg-gray-800/50
            text-sm text-gray-300
          "
          role="listitem"
        >
          <span className="truncate max-w-[200px]">
            {channel.channelName}
          </span>
          <div className="flex items-center gap-2">
            {channel.messageCount !== undefined && (
              <span className="text-gray-400">
                {channel.messageCount} msgs
              </span>
            )}
            {channel.status === 'processing' && (
              <Loader 
                className="w-4 h-4 animate-spin text-blue-400"
                data-testid="loader"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 