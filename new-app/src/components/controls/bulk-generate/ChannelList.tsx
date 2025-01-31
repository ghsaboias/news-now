import { ChannelActivity } from '@/types/discord';

interface ChannelListProps {
  channels: ChannelActivity[];
}

function ChannelStatus({ channel }: { channel: ChannelActivity }) {
  if (channel.status === 'pending') return 'Pending';

  const messageText = channel.messageCount !== undefined
    ? channel.messageCount === 1
      ? '1 message'
      : `${channel.messageCount} messages`
    : 'Scanning...';

  if (channel.status === 'success') {
    return <span>{messageText}</span>;
  }

  if (channel.status === 'skipped') {
    return <span>0 messages</span>;
  }

  if (channel.status === 'processing') {
    return <span>Fetching</span>;
  }

  return <span className="text-error-500">Error: {channel.error}</span>;
}

export function ChannelList({ channels }: ChannelListProps) {
  return (
    <div className="space-y-1">
      {channels.map(channel => (
        <div
          key={channel.channelId}
          className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg"
        >
          <span className="text-sm text-gray-200 truncate max-w-[160px]">{channel.channelName}</span>
          <div className="text-sm text-gray-400">
            <ChannelStatus channel={channel} />
          </div>
        </div>
      ))}
    </div>
  );
} 