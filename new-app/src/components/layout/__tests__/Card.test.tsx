import { fireEvent, render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('renders title and content', () => {
    render(
      <Card title="Test Card">
        <div>Card content</div>
      </Card>
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('uses theme spacing consistently', () => {
    render(<Card title="Test Card" />);
    const card = screen.getByText('Test Card').closest('div[class*="bg-gray-800"]');
    expect(card?.className).toContain('p-4');
    expect(card?.className).toContain('lg:p-6');
  });

  it('uses semantic colors', () => {
    render(<Card title="Test Card" />);
    const card = screen.getByText('Test Card').closest('div[class*="bg-gray-800"]');
    expect(card?.className).toContain('bg-gray-800');
    expect(card?.className).toContain('border-gray-600/50');
  });

  describe('interactive mode', () => {
    it('adds interactive styles when interactive prop is true', () => {
      render(<Card title="Test Card" interactive />);
      const card = screen.getByRole('button');
      expect(card.className).toContain('hover:bg-gray-700');
      expect(card.className).toContain('hover:border-gray-600');
      expect(card.className).toContain('cursor-pointer');
    });

    it('adds focus styles for interactive cards', () => {
      render(<Card title="Test Card" interactive />);
      const card = screen.getByRole('button');
      expect(card.className).toContain('focus-visible:ring-2');
      expect(card.className).toContain('focus-visible:ring-blue-500');
      expect(card.className).toContain('focus-visible:ring-offset-2');
    });

    it('calls onClick when clicked', () => {
      const onClick = jest.fn();
      render(<Card title="Test Card" interactive onClick={onClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  it('uses theme transitions', () => {
    render(<Card title="Test Card" />);
    const card = screen.getByText('Test Card').closest('div[class*="bg-gray-800"]');
    expect(card?.className).toContain('transition-colors');
    expect(card?.className).toContain('duration-DEFAULT');
  });

  it('renders message counts when provided', () => {
    render(
      <Card 
        title="Test Card" 
        messageCounts={{ 
          '1h': 10, 
          '4h': 20, 
          '24h': 50 
        }} 
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('shows loading state for specified periods', () => {
    render(
      <Card 
        title="Test Card" 
        messageCounts={{ '1h': 10 }}
        loadingPeriods={new Set(['4h', '24h'])}
      />
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getAllByText('...')).toHaveLength(2);
  });
}); 