import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText('Info')).toHaveClass('bg-blue-500/20', 'text-blue-400');

    rerender(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('bg-emerald-500/20', 'text-emerald-400');

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toHaveClass('bg-amber-500/20', 'text-amber-400');
  });

  it('applies default info variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toHaveClass('bg-blue-500/20', 'text-blue-400');
  });

  it('renders with title', () => {
    render(<Badge title="Badge Title">With Title</Badge>);
    expect(screen.getByTitle('Badge Title')).toBeInTheDocument();
  });

  it('applies additional className', () => {
    render(<Badge className="custom-class">With Class</Badge>);
    expect(screen.getByText('With Class')).toHaveClass('custom-class');
  });
}); 