import { render, screen } from '@testing-library/react';
import { Grid } from '../Grid';

describe('Grid', () => {
  it('renders children correctly', () => {
    render(
      <Grid>
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('applies default responsive columns', () => {
    const { container } = render(
      <Grid>
        <div>Item</div>
      </Grid>
    );

    expect(container.firstChild).toHaveClass(
      'grid-cols-1',
      'md:grid-cols-2',
      'lg:grid-cols-3'
    );
  });

  it('applies custom responsive columns', () => {
    const { container } = render(
      <Grid columns={{ sm: 2, md: 3, lg: 4 }}>
        <div>Item</div>
      </Grid>
    );

    expect(container.firstChild).toHaveClass(
      'grid-cols-2',
      'md:grid-cols-3',
      'lg:grid-cols-4'
    );
  });

  it('applies auto-fit grid with minChildWidth', () => {
    const { container } = render(
      <Grid minChildWidth="16rem">
        <div>Item</div>
      </Grid>
    );

    const style = (container.firstChild as HTMLElement).style;
    expect(style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(16rem, 1fr))');
  });

  it('applies correct spacing classes', () => {
    const { container: tight } = render(
      <Grid spacing="tight">
        <div>Item</div>
      </Grid>
    );
    expect(tight.firstChild).toHaveClass('gap-2');

    const { container: default_ } = render(
      <Grid spacing="default">
        <div>Item</div>
      </Grid>
    );
    expect(default_.firstChild).toHaveClass('gap-4');

    const { container: relaxed } = render(
      <Grid spacing="relaxed">
        <div>Item</div>
      </Grid>
    );
    expect(relaxed.firstChild).toHaveClass('gap-6');
  });

  it('applies additional className', () => {
    const { container } = render(
      <Grid className="custom-class">
        <div>Item</div>
      </Grid>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles partial responsive columns', () => {
    const { container } = render(
      <Grid columns={{ md: 3 }}>
        <div>Item</div>
      </Grid>
    );

    expect(container.firstChild).toHaveClass('grid-cols-1', 'md:grid-cols-3');
  });
}); 