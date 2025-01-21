import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChannelSelect } from '../ChannelSelect';

const mockChannels = [
  { id: '1', name: 'general', type: 0 },
  { id: '2', name: 'random', type: 0 }
];

describe('ChannelSelect', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    onSelect.mockClear();
  });

  it('renders channel options', () => {
    render(
      <ChannelSelect
        channels={mockChannels}
        selectedChannelId=""
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Select a channel')).toBeInTheDocument();
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('random')).toBeInTheDocument();
  });

  it('shows selected channel', () => {
    render(
      <ChannelSelect
        channels={mockChannels}
        selectedChannelId="1"
        onSelect={onSelect}
      />
    );

    expect(screen.getByDisplayValue('general')).toBeInTheDocument();
  });

  it('calls onSelect when channel is selected', () => {
    render(
      <ChannelSelect
        channels={mockChannels}
        selectedChannelId=""
        onSelect={onSelect}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(onSelect).toHaveBeenCalledWith('2');
  });

  it('disables select when disabled prop is true', () => {
    render(
      <ChannelSelect
        channels={mockChannels}
        selectedChannelId=""
        onSelect={onSelect}
        disabled
      />
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
  });
}); 