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
    const container = screen.getByText('...').closest('span[class*="flex items-center justify-between"]');
    expect(container?.className).toContain('animate-pulse');
    expect(container?.className).toContain('bg-gray-700/50');
  });

  it('renders empty state', () => {
    render(<MessageCount period="24h" />);
    expect(screen.getByText('0')).toBeInTheDocument();
    const container = screen.getByText('0').closest('span[class*="flex items-center justify-between"]');
    expect(container?.className).toContain('bg-transparent');
    expect(container?.className).toContain('border-gray-600/50');
  });

  it('applies correct styles based on state', () => {
    const { rerender } = render(<MessageCount period="1h" count={5} />);
    
    // With data
    let container = screen.getByText('5').closest('span[class*="flex items-center justify-between"]');
    expect(container?.className).toContain('bg-gray-700/50');
    expect(container?.className).toContain('border-gray-600');
    
    const countElement = screen.getByText('5').closest('span[class*="font-mono"]');
    expect(countElement?.className).toContain('text-gray-50');

    // Loading
    rerender(<MessageCount period="1h" isLoading />);
    container = screen.getByText('...').closest('span[class*="flex items-center justify-between"]');
    expect(container?.className).toContain('animate-pulse');
    expect(container?.className).toContain('border-gray-600/50');
    
    const loadingElement = screen.getByText('...').closest('span[class*="font-mono"]');
    expect(loadingElement?.className).toContain('text-gray-200');

    // Empty
    rerender(<MessageCount period="1h" />);
    container = screen.getByText('0').closest('span[class*="flex items-center justify-between"]');
    expect(container?.className).toContain('bg-transparent');
    expect(container?.className).toContain('border-gray-600/50');
    
    const emptyElement = screen.getByText('0').closest('span[class*="font-mono"]');
    expect(emptyElement?.className).toContain('text-gray-200');
  });
}); 