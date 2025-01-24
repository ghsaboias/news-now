import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimeSelect, TimeframeOption } from '../TimeSelect';

const mockOptions: TimeframeOption[] = [
  { value: '1h', label: 'Last Hour' },
  { value: '4h', label: 'Last 4 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
];

describe('TimeSelect', () => {
  it('renders all options', () => {
    const onChange = jest.fn();
    render(
      <TimeSelect
        value="1h"
        onChange={onChange}
        options={mockOptions}
        disabled={false}
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
        value="4h"
        onChange={onChange}
        options={mockOptions}
        disabled={false}
      />
    );

    const selectedButton = screen.getByText('Last 4 Hours').closest('button');
    const unselectedButton = screen.getByText('Last Hour').closest('button');
    
    expect(selectedButton).toHaveClass('bg-blue-600', 'text-gray-50');
    expect(unselectedButton).toHaveClass('bg-gray-700/50', 'text-gray-200');
  });

  it('calls onChange when option clicked', () => {
    const onChange = jest.fn();
    render(
      <TimeSelect
        value="4h"
        onChange={onChange}
        options={mockOptions}
        disabled={false}
      />
    );

    fireEvent.click(screen.getByText('Last Hour'));
    expect(onChange).toHaveBeenCalledWith('1h');
  });

  it('disables all buttons when disabled', () => {
    const onChange = jest.fn();
    render(
      <TimeSelect
        value="1h"
        onChange={onChange}
        options={mockOptions}
        disabled={true}
      />
    );

    mockOptions.forEach(option => {
      const button = screen.getByText(option.label).closest('button');
      expect(button).toBeDisabled();
    });
  });

  it('has correct ARIA attributes', () => {
    const onChange = jest.fn();
    render(
      <TimeSelect
        options={mockOptions}
        value="1h"
        onChange={onChange}
        disabled={false}
      />
    );

    expect(screen.getByRole('group')).toBeInTheDocument();
  });
}); 