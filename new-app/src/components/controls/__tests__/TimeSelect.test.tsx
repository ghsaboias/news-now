import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimeSelect, TimeframeOption } from '../TimeSelect';

const mockOptions: TimeframeOption[] = [
  { value: '1h', label: 'Last Hour' },
  { value: '4h', label: 'Last 4 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
];

describe('TimeSelect', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('renders all options', () => {
    render(
      <TimeSelect
        value="1h"
        onChange={onChange}
        options={mockOptions}
      />
    );

    expect(screen.getByText('Last Hour')).toBeInTheDocument();
    expect(screen.getByText('Last 4 Hours')).toBeInTheDocument();
    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
  });

  it('shows selected option with primary variant', () => {
    render(
      <TimeSelect
        value="4h"
        onChange={onChange}
        options={mockOptions}
      />
    );

    const selectedButton = screen.getByText('Last 4 Hours').closest('button');
    expect(selectedButton).toHaveClass('bg-blue-600');
  });

  it('shows unselected options with secondary variant', () => {
    render(
      <TimeSelect
        value="4h"
        onChange={onChange}
        options={mockOptions}
      />
    );

    const unselectedButton = screen.getByText('Last Hour').closest('button');
    expect(unselectedButton).toHaveClass('bg-gray-600/20');
  });

  it('calls onChange when option is clicked', () => {
    render(
      <TimeSelect
        value="1h"
        onChange={onChange}
        options={mockOptions}
      />
    );

    fireEvent.click(screen.getByText('Last 4 Hours'));
    expect(onChange).toHaveBeenCalledWith('4h');
  });

  it('disables all buttons when disabled', () => {
    render(
      <TimeSelect
        value="1h"
        onChange={onChange}
        options={mockOptions}
        disabled
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('renders Clock icon for each option', () => {
    const onChange = jest.fn();
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={onChange}
      />
    );

    // Clock icons are SVGs
    const icons = document.querySelectorAll('svg');
    expect(icons).toHaveLength(mockOptions.length);
  });
}); 