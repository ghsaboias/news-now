import { render, screen } from '@testing-library/react';
import { Progress } from '../Progress';

describe('Progress', () => {
  it('renders step text', () => {
    render(<Progress step="Processing" />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('shows message count when provided', () => {
    render(<Progress step="Processing" messageCount={42} />);
    expect(screen.getByText('(42 messages)')).toBeInTheDocument();
  });

  it('shows percentage when provided', () => {
    render(<Progress step="Processing" percent={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('uses theme spacing', () => {
    render(<Progress step="Processing" />);
    expect(screen.getByRole('status')).toHaveClass('space-y-3');
  });

  it('uses semantic colors', () => {
    render(<Progress step="Processing" percent={50} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-gray-700/50');
    expect(progressBar.firstElementChild).toHaveClass('bg-blue-600');
  });

  it('uses theme transitions', () => {
    render(<Progress step="Processing" percent={50} />);
    const progressBar = screen.getByRole('progressbar').firstElementChild;
    expect(progressBar).toHaveClass('duration-DEFAULT', 'ease-out');
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes for progress bar', () => {
      render(<Progress step="Processing" percent={75} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has descriptive status message', () => {
      render(<Progress step="Processing" percent={75} messageCount={42} />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Processing - 42 messages - 75% complete');
    });
  });
}); 