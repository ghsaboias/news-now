import { ChannelActivity } from '@/types';
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
        status="scanning"
        channels={mockChannels}
      />
    );
    expect(screen.getByText(/scanning channels/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show channels/i })).toBeInTheDocument();
  });

  it('toggles channel list visibility when button is clicked', () => {
    render(
      <ProgressDisplay 
        status="scanning"
        channels={mockChannels}
      />
    );
    
    // Initially hidden
    expect(screen.queryByText('channel-1')).not.toBeInTheDocument();
    
    // Show channels
    const toggleButton = screen.getByRole('button', { name: /show channels/i });
    fireEvent.click(toggleButton);
    expect(screen.getByText('channel-1')).toBeInTheDocument();
    expect(screen.getByText('channel-2')).toBeInTheDocument();
    
    // Hide channels
    fireEvent.click(toggleButton);
    expect(screen.queryByText('channel-1')).not.toBeInTheDocument();
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

  it('shows correct channel counts', () => {
    render(
      <ProgressDisplay 
        status="scanning"
        channels={mockChannels}
      />
    );
    expect(screen.getByText(/show channels \(1\/2\)/i)).toBeInTheDocument();
  });

  it('shows total message count', () => {
    render(
      <ProgressDisplay 
        status="scanning"
        channels={mockChannels}
      />
    );
    expect(screen.getByText(/15 messages/i)).toBeInTheDocument();
  });
}); 