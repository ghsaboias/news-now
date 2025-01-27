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

  if (status === 'idle' || channels.length === 0) {
    return null;
  }

  // Calculate progress based on processed channels
  const processedChannels = channels.filter(ch => ch.status !== 'pending').length;
  const totalChannels = channels.length;
  const percent = Math.min(100, Math.round((processedChannels / totalChannels) * 100));

  // Get stage text
  const getStage = () => {
    if (error || status === 'error') return 'Error';
    if (status === 'complete') return 'Complete';
    return 'Processing Channels';
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {channels.length > 0 && (
        <Progress
          value={status === 'complete' ? 100 : percent}
          stage={getStage()}
          status={`${processedChannels} of ${totalChannels} channels`}
          error={error}
        />
      )}

      <div className="flex items-center justify-end">
        <Button
          variant="secondary"
          onClick={onToggle}
          icon={isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          size="sm"
        >
          {isOpen ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      <div
        className={`
          overflow-hidden transition-all duration-DEFAULT
          ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <ChannelList channels={channels} />
      </div>
    </div>
  );
} 