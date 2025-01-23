import { Button } from '@/components/common/Button';
import { Progress } from '@/components/common/Progress';
import { useDisclosure } from '@/hooks/useDisclosure';
import { ChannelActivity } from '@/types';
import { ChevronDown, ChevronUp } from 'react-feather';
import { ChannelList } from './ChannelList';

interface ProgressDisplayProps {
  /** Current status of the progress */
  status: 'idle' | 'scanning' | 'complete' | 'error';
  /** List of channels being processed */
  channels: ChannelActivity[];
}

/**
 * Displays progress information and a list of channels being processed
 */
export function ProgressDisplay({ 
  status, 
  channels
}: ProgressDisplayProps) {
  const { isOpen, onToggle } = useDisclosure(false);

  if (status === 'idle') {
    return null;
  }

  const completedChannels = channels.filter(ch => ch.status === 'success').length;
  const totalChannels = channels.length;
  const percent = totalChannels > 0 ? (completedChannels / totalChannels) * 100 : 0;

  return (
    <div className="space-y-4">
      <Progress
        step={
          status === 'scanning' ? 'Scanning channels' :
          status === 'complete' ? 'Scan complete' :
          status === 'error' ? 'An error occurred' :
          'Processing'
        }
        percent={status === 'scanning' ? percent : status === 'complete' ? 100 : undefined}
        messageCount={channels.reduce((sum, ch) => sum + (ch.messageCount || 0), 0)}
      />

      {channels.length > 0 && (
        <div className="flex items-center justify-end">
          <Button
            variant="secondary"
            onClick={onToggle}
            icon={isOpen ? <ChevronUp /> : <ChevronDown />}
            size="sm"
          >
            {isOpen ? 'Hide Channels' : `Show Channels (${completedChannels}/${totalChannels})`}
          </Button>
        </div>
      )}

      <div className={`transition-all duration-DEFAULT ${isOpen ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0'} overflow-hidden`}>
        {channels.length > 0 && <ChannelList channels={channels} />}
      </div>
    </div>
  );
} 