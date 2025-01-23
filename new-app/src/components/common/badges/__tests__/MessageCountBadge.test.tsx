import { render, screen } from '@testing-library/react';
import { MessageCountBadge } from '../MessageCountBadge';

describe('MessageCountBadge', () => {
  it('renders count correctly', () => {
    render(<MessageCountBadge count={5} />);
    expect(screen.getByText('5 msgs')).toBeInTheDocument();
  });

  it('uses warning variant styles', () => {
    render(<MessageCountBadge count={5} />);
    expect(screen.getByText('5 msgs')).toHaveClass('bg-amber-500/20', 'text-amber-400');
  });

  it('sets correct title', () => {
    render(<MessageCountBadge count={5} />);
    expect(screen.getByTitle('5 messages processed')).toBeInTheDocument();
  });

  it('applies additional className', () => {
    render(<MessageCountBadge count={5} className="custom-class" />);
    expect(screen.getByText('5 msgs')).toHaveClass('custom-class');
  });
}); 