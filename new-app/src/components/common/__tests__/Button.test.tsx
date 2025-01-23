import { fireEvent, render, screen } from '@testing-library/react';
import { RefreshCw } from 'react-feather';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies variant styles correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-800/80');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-red-400');
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('disabled:opacity-50');
  });

  it('applies full width style', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('handles click events', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders with icon', () => {
    render(<Button icon={<RefreshCw data-testid="icon" />}>With Icon</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('sets button type', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('sets title attribute', () => {
    render(<Button title="Button title">With Title</Button>);
    expect(screen.getByTitle('Button title')).toBeInTheDocument();
  });

  describe('icon placement', () => {
    it('places icon before text in normal state', () => {
      render(<Button icon={<RefreshCw data-testid="icon" />}>With Icon</Button>);
      const button = screen.getByRole('button');
      const icon = screen.getByTestId('icon');
      const text = screen.getByText('With Icon');
      
      // Check DOM order
      expect(button.firstElementChild).toContainElement(icon);
      expect(button.lastElementChild).toContainElement(text);
    });

    it('places loading spinner before text', () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      const spinner = document.querySelector('.animate-spin') as HTMLElement;
      const text = screen.getByText('Loading');
      
      // Check DOM order
      expect(button.firstElementChild).toContainElement(spinner);
      expect(button.lastElementChild).toContainElement(text);
    });

    it('prevents icon from shrinking', () => {
      render(<Button icon={<RefreshCw data-testid="icon" />}>Long text that could cause wrapping</Button>);
      const iconWrapper = screen.getByTestId('icon').parentElement;
      expect(iconWrapper).toHaveClass('flex-shrink-0');
    });
  });

  describe('styling', () => {
    it('uses theme duration for transitions', () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('duration-DEFAULT');
    });

    it('uses theme spacing for padding and gap', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-3', 'gap-3');
    });

    it('applies semantic colors for variants', () => {
      const { rerender } = render(<Button variant="primary">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-gray-50', 'bg-blue-600');

      rerender(<Button variant="secondary">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-gray-200', 'bg-gray-700/50');

      rerender(<Button variant="danger">Test</Button>);
      expect(screen.getByRole('button')).toHaveClass('text-error-500', 'bg-gray-700/50');
    });

    it('has proper focus states', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'focus-visible:ring-2',
        'focus-visible:ring-offset-2',
        'focus:outline-none'
      );
    });

    it('applies transitions correctly', () => {
      render(<Button>Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('transition-colors');
    });

    it('styles disabled state properly', () => {
      const { rerender } = render(<Button disabled variant="primary">Test</Button>);
      let button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:bg-blue-600/50');

      rerender(<Button disabled variant="secondary">Test</Button>);
      button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:bg-gray-700/25');
    });
  });

  describe('size variants', () => {
    it('applies small size styles correctly', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-2', 'text-sm', 'gap-2', 'rounded-md');
    });

    it('applies medium size styles correctly', () => {
      render(<Button size="md">Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-3', 'text-sm', 'gap-3', 'rounded-lg');
    });

    it('applies large size styles correctly', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-4', 'text-base', 'gap-3', 'rounded-lg');
    });

    it('uses medium size as default', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('p-3', 'text-sm', 'gap-3', 'rounded-lg');
    });

    it('maintains icon spacing across sizes', () => {
      const { rerender } = render(
        <Button size="sm" icon={<RefreshCw data-testid="icon" />}>
          Small with Icon
        </Button>
      );
      expect(screen.getByRole('button')).toHaveClass('gap-2');

      rerender(
        <Button size="lg" icon={<RefreshCw data-testid="icon" />}>
          Large with Icon
        </Button>
      );
      expect(screen.getByRole('button')).toHaveClass('gap-3');
    });
  });
}); 