import { render, screen } from '@testing-library/react';
import { Stack } from '../Stack';

describe('Stack', () => {
  it('renders children correctly', () => {
    render(
      <Stack>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('applies vertical direction by default', () => {
    const { container } = render(
      <Stack>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    expect(container.firstChild).toHaveClass('flex-col');
  });

  it('applies horizontal direction when specified', () => {
    const { container } = render(
      <Stack direction="horizontal">
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    expect(container.firstChild).toHaveClass('flex-row');
  });

  it('applies correct spacing classes', () => {
    const { container: tight } = render(
      <Stack spacing="tight">
        <div>Item</div>
      </Stack>
    );
    expect(tight.firstChild).toHaveClass('gap-2');

    const { container: default_ } = render(
      <Stack spacing="default">
        <div>Item</div>
      </Stack>
    );
    expect(default_.firstChild).toHaveClass('gap-3');

    const { container: relaxed } = render(
      <Stack spacing="relaxed">
        <div>Item</div>
      </Stack>
    );
    expect(relaxed.firstChild).toHaveClass('gap-4');
  });

  it('applies wrap class when specified', () => {
    const { container } = render(
      <Stack wrap>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    expect(container.firstChild).toHaveClass('flex-wrap');
  });

  it('applies divider classes when specified', () => {
    const { container: vertical } = render(
      <Stack divider>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );
    expect(vertical.firstChild).toHaveClass('divide-gray-700', 'divide-y');

    const { container: horizontal } = render(
      <Stack direction="horizontal" divider>
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );
    expect(horizontal.firstChild).toHaveClass('divide-gray-700', 'divide-x');
  });

  it('renders as specified HTML element', () => {
    const { container } = render(
      <Stack as="section">
        <div>Item 1</div>
        <div>Item 2</div>
      </Stack>
    );

    expect(container.firstChild?.nodeName).toBe('SECTION');
  });

  it('renders as list when specified', () => {
    const { container } = render(
      <Stack as="ul">
        <li>Item 1</li>
        <li>Item 2</li>
      </Stack>
    );

    expect(container.firstChild?.nodeName).toBe('UL');
  });

  it('applies additional className', () => {
    const { container } = render(
      <Stack className="custom-class">
        <div>Item</div>
      </Stack>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
}); 