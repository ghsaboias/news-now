import { ChannelActivity } from '@/types/discord';
import { render, screen } from '@testing-library/react';
import { ChannelList } from '../ChannelList';

const mockChannels: ChannelActivity[] = [
  {
    channelId: '1',
    channelName: 'general',
    messageCount: 100,
    status: 'success'
  },
  {
    channelId: '2',
    channelName: 'random',
    messageCount: undefined,
    status: 'processing'
  }
];

describe('ChannelList', () => {
  it('returns null when channels array is empty', () => {
    const { container } = render(<ChannelList channels={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders channel names', () => {
    render(<ChannelList channels={mockChannels} />);
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('random')).toBeInTheDocument();
  });

  it('renders message count when available', () => {
    render(<ChannelList channels={mockChannels} />);
    expect(screen.getByText('100 msgs')).toBeInTheDocument();
  });

  it('shows loading spinner for processing channels', () => {
    render(<ChannelList channels={mockChannels} />);
    const loadingSpinner = screen.getByTestId('loader');
    expect(loadingSpinner).toBeInTheDocument();
    expect(loadingSpinner).toHaveClass('w-4', 'h-4', 'animate-spin', 'text-blue-400');
  });

  it('shows channel status indicators', () => {
    render(<ChannelList channels={mockChannels} />);

    // Success channel shows message count
    const successChannel = screen.getByText('general').closest('[role="listitem"]');
    expect(successChannel).toHaveClass(
      'flex',
      'items-center',
      'justify-between',
      'p-2',
      'rounded-lg',
      'bg-gray-800/50',
      'text-sm',
      'text-gray-300'
    );
    expect(screen.getByText('100 msgs')).toBeInTheDocument();

    // Processing channel shows loader
    const processingChannel = screen.getByText('random').closest('[role="listitem"]');
    expect(processingChannel).toHaveClass(
      'flex',
      'items-center',
      'justify-between',
      'p-2',
      'rounded-lg',
      'bg-gray-800/50',
      'text-sm',
      'text-gray-300'
    );
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('uses theme spacing and colors', () => {
    render(<ChannelList channels={mockChannels} />);
    const channelItems = screen.getAllByRole('listitem');
    channelItems.forEach(item => {
      expect(item.className).toContain('flex items-center justify-between');
      expect(item.className).toContain('p-2 rounded-lg');
      expect(item.className).toContain('bg-gray-800/50');
      expect(item.className).toContain('text-sm text-gray-300');
    });
  });
}); 