import { render, screen } from '@testing-library/react';
import { MessageCount } from '../MessageCount';

describe('MessageCount', () => {
  it('renders with count', () => {
    render(<MessageCount period="1h" count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('msgs')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    render(<MessageCount period="4h" isLoading />);
    expect(screen.getByText('...')).toBeInTheDocument();
    const container = screen.getByText('...').closest('span');
    expect(container).toHaveClass('animate-pulse');
  });

  it('renders empty state', () => {
    render(<MessageCount period="24h" />);
    expect(screen.getByText('0')).toBeInTheDocument();
    const container = screen.getByText('0').closest('span');
    expect(container).toHaveClass('text-gray-200');
  });

  it('applies correct styles based on state', () => {
    const { rerender } = render(<MessageCount period="1h" count={5} />);
    
    // With data
    let container = screen.getByText('5').closest('span');
    expect(container).toHaveClass('bg-gray-700/50', 'border-gray-600');
    expect(screen.getByText('5')).toHaveClass('text-gray-50');

    // Loading
    rerender(<MessageCount period="1h" isLoading />);
    container = screen.getByText('...').closest('span');
    expect(container).toHaveClass('animate-pulse', 'border-gray-600/50');
    expect(screen.getByText('...')).toHaveClass('text-gray-200');

    // Empty
    rerender(<MessageCount period="1h" />);
    container = screen.getByText('0').closest('span');
    expect(container).toHaveClass('bg-transparent', 'border-gray-600/50');
    expect(screen.getByText('0')).toHaveClass('text-gray-200');
  });
}); 