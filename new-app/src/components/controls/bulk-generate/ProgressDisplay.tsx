import { Button } from '@/components/common/Button';
import { Progress } from '@/components/common/Progress';
import { useDisclosure } from '@/hooks/useDisclosure';
import { ChannelActivity } from '@/types';
import { ChevronDown, ChevronUp } from 'react-feather';
import { ChannelList } from './ChannelList';

interface ProgressDisplayProps {
  /** Current status of the progress */
  status: 'idle' | 'processing' | 'complete' | 'error';
  /** List of channels being processed */
  channels: ChannelActivity[];
  /** Error message if any */
  error?: string;
}

/**
 * Displays progress information and a list of channels being processed
 */
export function ProgressDisplay({
  status,
  channels,
  error
}: ProgressDisplayProps) {
  const { isOpen, onToggle } = useDisclosure(false);

  if (status === 'idle') {
    return null;
  }

  // Calculate progress based on processed channels
  const processedChannels = channels.filter(ch => ch.status !== 'pending').length;
  const totalChannels = channels.length || 1; // Prevent division by zero
  const percent = Math.min(100, Math.round((processedChannels / totalChannels) * 100));

  // Get total message count
  const totalMessages = channels.reduce((sum, ch) => sum + (ch.messageCount || 0), 0);

  // Get current stage
  const getStage = () => {
    if (error || status === 'error') return 'Error generating report';
    if (status === 'complete') return 'Complete';

    const processing = channels.find(ch => ch.status === 'processing');
    if (processing) return `Processing ${processing.channelName}`;

    return 'Scanning channels';
  };

  return (
    <div className="space-y-4">
      <Progress
        value={status === 'complete' ? 100 : percent}
        stage={getStage()}
        messageCount={totalMessages}
        error={error}
        status={`${processedChannels}/${totalChannels} channels processed`}
      />

      {channels.length > 0 && (
        <div className="flex items-center justify-end">
          <Button
            variant="secondary"
            onClick={onToggle}
            icon={isOpen ? <ChevronUp /> : <ChevronDown />}
            size="sm"
          >
            {isOpen ? 'Hide Channels' : `Show Channels (${processedChannels}/${totalChannels})`}
          </Button>
        </div>
      )}

      <div className={`transition-all duration-DEFAULT ${isOpen ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0'} overflow-hidden`}>
        {channels.length > 0 && <ChannelList channels={channels} />}
      </div>
    </div>
  );
} 