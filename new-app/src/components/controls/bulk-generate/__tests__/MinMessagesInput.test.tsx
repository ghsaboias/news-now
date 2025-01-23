import { fireEvent, render, screen } from '@testing-library/react';
import { MinMessagesInput } from '../MinMessagesInput';

describe('MinMessagesInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders label and input', () => {
    render(
      <MinMessagesInput
        value={10}
        onChange={mockOnChange}
        disabled={false}
      />
    );

    expect(screen.getByLabelText('Minimum Messages')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(10);
  });

  it('calls onChange with valid numbers', () => {
    render(
      <MinMessagesInput
        value={10}
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '15' } });
    expect(mockOnChange).toHaveBeenCalledWith(15);
  });

  it('enforces minimum value of 1', () => {
    render(
      <MinMessagesInput
        value={10}
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '0' } });
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it('handles invalid input', () => {
    render(
      <MinMessagesInput
        value={10}
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it('disables input when disabled prop is true', () => {
    render(
      <MinMessagesInput
        value={10}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    expect(screen.getByRole('spinbutton')).toBeDisabled();
  });

  it('uses theme spacing and colors', () => {
    render(
      <MinMessagesInput
        value={10}
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass(
      'p-3',
      'bg-gray-800/80',
      'text-gray-50',
      'border-gray-700'
    );
  });

  it('has proper focus states', () => {
    render(
      <MinMessagesInput
        value={10}
        onChange={mockOnChange}
        disabled={false}
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass(
      'focus:ring-2',
      'focus:ring-blue-500',
      'focus:outline-none'
    );
  });
}); 