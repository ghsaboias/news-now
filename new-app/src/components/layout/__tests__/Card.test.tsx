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
    const card = screen.getByText('Test Card').closest('div');
    expect(card).toHaveClass('p-4', 'lg:p-6');

    const container = screen.getByText('Test Card').parentElement;
    expect(container).toHaveClass('gap-4');
  });

  it('uses semantic colors', () => {
    render(<Card title="Test Card" />);
    const card = screen.getByText('Test Card').closest('div');
    expect(card).toHaveClass('bg-gray-800', 'border-gray-600/50');
  });

  describe('interactive mode', () => {
    it('adds interactive styles when interactive prop is true', () => {
      render(<Card title="Test Card" interactive />);
      const card = screen.getByRole('button');
      expect(card).toHaveClass(
        'hover:bg-gray-700',
        'hover:border-gray-600',
        'cursor-pointer'
      );
    });

    it('adds focus styles for interactive cards', () => {
      render(<Card title="Test Card" interactive />);
      const card = screen.getByRole('button');
      expect(card).toHaveClass(
        'focus-visible:ring-2',
        'focus-visible:ring-blue-500',
        'focus-visible:ring-offset-2'
      );
    });

    it('handles click events when interactive', () => {
      const onClick = jest.fn();
      render(<Card title="Test Card" interactive onClick={onClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalled();
    });

    it('adds correct ARIA attributes when interactive', () => {
      render(<Card title="Test Card" interactive />);
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  it('uses theme transitions', () => {
    render(<Card title="Test Card" />);
    const card = screen.getByText('Test Card').closest('div');
    expect(card).toHaveClass('transition-colors', 'duration-DEFAULT');
  });
}); 