import { ChannelActivity } from '@/types/discord';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProgressDisplay } from '../ProgressDisplay';

const mockChannels: ChannelActivity[] = [
  { channelId: '1', channelName: 'channel-1', status: 'success', messageCount: 10 },
  { channelId: '2', channelName: 'channel-2', status: 'processing', messageCount: 5 }
];

describe('ProgressDisplay', () => {
  it('renders idle state correctly', () => {
    render(
      <ProgressDisplay
        status="idle"
        channels={[]}
      />
    );
    expect(screen.queryByText(/scanning channels/i)).not.toBeInTheDocument();
  });

  it('renders scanning state with channels', () => {
    render(
      <ProgressDisplay
        status="processing"
        channels={mockChannels}
      />
    );
    expect(screen.getByText(/scanning channels/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show channels/i })).toBeInTheDocument();
  });

  it('toggles channel list visibility when button is clicked', () => {
    render(
      <ProgressDisplay
        status="processing"
        channels={mockChannels}
      />
    );

    // Initially hidden
    const channelList = screen.getByText('channel-1').closest('div[class*="transition-all"]');
    expect(channelList).toHaveClass('opacity-0', 'max-h-0');

    // Show channels
    const toggleButton = screen.getByRole('button', { name: /show channels/i });
    fireEvent.click(toggleButton);
    expect(channelList).toHaveClass('opacity-100', 'max-h-96');

    // Hide channels
    fireEvent.click(toggleButton);
    expect(channelList).toHaveClass('opacity-0', 'max-h-0');
  });

  it('renders complete state correctly', () => {
    render(
      <ProgressDisplay
        status="complete"
        channels={mockChannels}
      />
    );
    expect(screen.getByText(/scan complete/i)).toBeInTheDocument();
  });

  it('shows channel count in toggle button', () => {
    render(
      <ProgressDisplay
        status="processing"
        channels={mockChannels}
      />
    );

    expect(screen.getByRole('button', { name: /show channels \(1\/2\)/i })).toBeInTheDocument();
  });

  it('updates progress based on completed channels', () => {
    render(
      <ProgressDisplay
        status="processing"
        channels={mockChannels}
      />
    );

    // One out of two channels completed = 50%
    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows total message count', () => {
    render(
      <ProgressDisplay
        status="processing"
        channels={mockChannels}
      />
    );

    // Sum of message counts: 10 + 5 = 15
    expect(screen.getByText(/15 messages/i)).toBeInTheDocument();
  });
}); 