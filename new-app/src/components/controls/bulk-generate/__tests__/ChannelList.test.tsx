import { ChannelActivity } from '@/types';
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
    expect(screen.getByText('100 messages')).toBeInTheDocument();
  });

  it('shows loading spinner for processing channels', () => {
    render(<ChannelList channels={mockChannels} />);
    const loadingSpinner = screen.getByTestId('loader');
    expect(loadingSpinner).toBeInTheDocument();
    expect(loadingSpinner).toHaveClass('animate-spin');
  });

  it('shows channel status', () => {
    render(<ChannelList channels={mockChannels} />);
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('processing')).toBeInTheDocument();
  });

  it('uses theme spacing and colors', () => {
    render(<ChannelList channels={mockChannels} />);
    const container = screen.getByRole('list');
    expect(container).toHaveClass('space-y-2');

    const channelItems = screen.getAllByRole('listitem');
    channelItems.forEach(item => {
      expect(item).toHaveClass(
        'bg-gray-800/50',
        'border-gray-700/50',
        'rounded-lg',
        'p-3'
      );
    });
  });
}); 