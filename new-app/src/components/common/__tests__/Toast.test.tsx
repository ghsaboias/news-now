import { act, fireEvent, render, screen } from '@testing-library/react';
import { Toast } from '../Toast';

jest.useFakeTimers();

describe('Toast', () => {
  it('renders message and close button', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('uses theme spacing and colors', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} />);

    const toast = screen.getByText('Test message').closest('div');
    expect(toast).toHaveClass(
      'gap-3',
      'px-4',
      'py-3',
      'bg-gray-800/95',
      'text-gray-50'
    );
  });

  it('uses theme transitions and animations', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} />);

    const toast = screen.getByText('Test message').closest('div');
    expect(toast).toHaveClass(
      'transition-all',
      'duration-DEFAULT',
      'animate-[fade-in_5s_ease-out,fade-out_5s_ease-in_forwards]'
    );
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('auto-closes after duration', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} duration={1000} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onClose).toHaveBeenCalled();
  });
}); 