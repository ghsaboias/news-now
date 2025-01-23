import { render, screen } from '@testing-library/react';
import { TimeframeBadge } from '../TimeframeBadge';

describe('TimeframeBadge', () => {
  it('renders timeframe correctly', () => {
    render(<TimeframeBadge timeframe="1h" />);
    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<TimeframeBadge timeframe="1h" />);
    expect(screen.getByText('1h')).toHaveClass('bg-emerald-500/20', 'text-emerald-400');

    rerender(<TimeframeBadge timeframe="4h" />);
    expect(screen.getByText('4h')).toHaveClass('bg-blue-500/20', 'text-blue-400');

    rerender(<TimeframeBadge timeframe="24h" />);
    expect(screen.getByText('24h')).toHaveClass('bg-amber-500/20', 'text-amber-400');
  });

  it('sets correct title', () => {
    const { rerender } = render(<TimeframeBadge timeframe="1h" />);
    expect(screen.getByTitle('Last 1 hour')).toBeInTheDocument();

    rerender(<TimeframeBadge timeframe="4h" />);
    expect(screen.getByTitle('Last 4 hours')).toBeInTheDocument();

    rerender(<TimeframeBadge timeframe="24h" />);
    expect(screen.getByTitle('Last 24 hours')).toBeInTheDocument();
  });

  it('applies additional className', () => {
    render(<TimeframeBadge timeframe="1h" className="custom-class" />);
    expect(screen.getByText('1h')).toHaveClass('custom-class');
  });
}); 