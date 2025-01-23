import { fireEvent, render, screen } from '@testing-library/react';
import { TimeSelect } from '../TimeSelect';

type TimeframeValue = '1h' | '4h' | '24h';

interface TimeframeOption {
  label: string;
  value: TimeframeValue;
}

const mockOptions: TimeframeOption[] = [
  { label: '1 hour', value: '1h' },
  { label: '4 hours', value: '4h' },
  { label: '24 hours', value: '24h' }
];

describe('TimeframeSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all timeframe options', () => {
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={mockOnChange}
        disabled={false}
      />
    );

    mockOptions.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('shows selected option as active', () => {
    render(
      <TimeSelect
        options={mockOptions}
        value="4h"
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const selectedButton = screen.getByRole('button', { name: '4 hours' });
    expect(selectedButton).toHaveClass('bg-gray-700');
  });

  it('calls onChange when option is selected', () => {
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const button = screen.getByRole('button', { name: '4 hours' });
    fireEvent.click(button);
    expect(mockOnChange).toHaveBeenCalledWith('4h');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('maintains proper spacing between buttons', () => {
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const container = screen.getByRole('group');
    expect(container).toHaveClass('gap-2');
  });
}); 