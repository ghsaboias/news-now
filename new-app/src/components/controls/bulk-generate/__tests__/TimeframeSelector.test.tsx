import { fireEvent, render, screen } from '@testing-library/react';
import { TimeSelect } from '../../TimeSelect';

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

describe('TimeSelect', () => {
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
      expect(screen.getByRole('button', { name: option.label })).toBeInTheDocument();
    });
  });

  it('shows selected option with primary variant', () => {
    render(
      <TimeSelect
        options={mockOptions}
        value="4h"
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const selectedButton = screen.getByRole('button', { name: '4 hours' });
    const unselectedButton = screen.getByRole('button', { name: '1 hour' });

    // Primary variant styles
    expect(selectedButton.className).toContain('bg-blue-600');
    expect(selectedButton.className).toContain('text-gray-50');

    // Secondary variant styles
    expect(unselectedButton.className).toContain('bg-gray-700/50');
    expect(unselectedButton.className).toContain('text-gray-200');
  });

  it('calls onChange when option is clicked', () => {
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={mockOnChange}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '4 hours' }));
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

  it('uses consistent theme spacing', () => {
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const container = screen.getByRole('group');
    expect(container.className).toContain('w-full');
    
    const grid = container.firstElementChild;
    expect(grid?.className).toContain('grid-cols-3');
    expect(grid?.className).toContain('gap-2');
  });
}); 