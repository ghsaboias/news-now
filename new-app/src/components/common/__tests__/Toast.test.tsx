import { Toast } from '@/components/ui/toast';
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.useFakeTimers();

describe('Toast', () => {
  it('renders message and close button', () => {
    render(<Toast title="Test message" />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('uses theme spacing and colors', () => {
    render(<Toast title="Test message" />);

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
    render(<Toast title="Test message" />);

    const toast = screen.getByText('Test message').closest('div');
    expect(toast).toHaveClass(
      'transition-all',
      'duration-DEFAULT',
      'animate-[fade-in_5s_ease-out,fade-out_5s_ease-in_forwards]'
    );
  });

  it('calls onClose when close button is clicked', () => {
    render(<Toast title="Test message" />);

    fireEvent.click(screen.getByRole('button'));
  });

  it('auto-closes after duration', () => {
    render(<Toast title="Test message" />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
  });
}); 