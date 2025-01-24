import { render, screen } from '@testing-library/react';
import { Progress } from '../Progress';

describe('Progress', () => {
  it('renders step text', () => {
    render(<Progress stage="processing" value={50} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('shows message count when provided', () => {
    render(<Progress stage="processing" value={42} messageCount={42} />);
    expect(screen.getByText('(42 messages)')).toBeInTheDocument();
  });

  it('shows percentage when provided', () => {
    render(<Progress stage="processing" value={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('uses theme spacing', () => {
    render(<Progress stage="processing" value={50} />);
    expect(screen.getByRole('status')).toHaveClass('space-y-3');
  });

  it('uses semantic colors', () => {
    render(<Progress stage="processing" value={50} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-gray-700/50');
    expect(progressBar.firstElementChild).toHaveClass('bg-blue-600');
  });

  it('uses theme transitions', () => {
    render(<Progress stage="processing" value={50} />);
    const progressBar = screen.getByRole('progressbar').firstElementChild;
    expect(progressBar).toHaveClass('duration-DEFAULT', 'ease-out');
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes for progress bar', () => {
      render(<Progress stage="processing" value={42} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '42');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has descriptive status message', () => {
      render(<Progress stage="processing" value={42} messageCount={42} />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Processing - 42 messages - 42% complete');
    });
  });
}); 