import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimeSelect, TimeframeOption } from '../TimeSelect';

const mockOptions: TimeframeOption[] = [
  { value: '1h', label: 'Last Hour' },
  { value: '4h', label: 'Last 4 Hours' },
  { value: '24h', label: 'Last 24 Hours' }
];

describe('TimeSelect', () => {
  it('renders all options', () => {
    const onChange = jest.fn();
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={onChange}
      />
    );

    mockOptions.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument();
    });
  });

  it('highlights selected option', () => {
    const onChange = jest.fn();
    render(
      <TimeSelect
        options={mockOptions}
        value="4h"
        onChange={onChange}
      />
    );

    const selectedButton = screen.getByText('Last 4 Hours');
    expect(selectedButton).toHaveClass('bg-indigo-600', 'text-white');
  });

  it('calls onChange when option is clicked', () => {
    const onChange = jest.fn();
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText('Last 4 Hours'));
    expect(onChange).toHaveBeenCalledWith('4h');
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