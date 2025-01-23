import { fireEvent, render, screen } from '@testing-library/react';
import { Section } from '../Section';

describe('Section', () => {
  it('renders children correctly', () => {
    render(
      <Section>
        <div>Content 1</div>
        <div>Content 2</div>
      </Section>
    );

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Section title="Section Title">
        <div>Content</div>
      </Section>
    );

    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('applies correct variant styles', () => {
    const { container: surface } = render(
      <Section variant="surface">
        <div>Content</div>
      </Section>
    );
    expect(surface.firstChild).toHaveClass('bg-gray-800/50');

    const { container: raised } = render(
      <Section variant="raised">
        <div>Content</div>
      </Section>
    );
    expect(raised.firstChild).toHaveClass('bg-gray-700/50', 'backdrop-blur-sm');
  });

  describe('collapsible behavior', () => {
    it('renders as non-collapsible by default', () => {
      render(
        <Section title="Section Title">
          <div>Content</div>
        </Section>
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('renders as collapsible when specified', () => {
      render(
        <Section title="Section Title" collapsible>
          <div>Content</div>
        </Section>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('toggles content visibility when clicked', () => {
      render(
        <Section title="Section Title" collapsible defaultExpanded={false}>
          <div>Content</div>
        </Section>
      );

      // Initially hidden
      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      // Show content
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Content')).toBeInTheDocument();

      // Hide content
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('respects defaultExpanded prop', () => {
      render(
        <Section title="Section Title" collapsible defaultExpanded={true}>
          <div>Content</div>
        </Section>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  it('applies divider when specified', () => {
    render(
      <Section title="Section Title" divider>
        <div>Content</div>
      </Section>
    );

    const titleContainer = screen.getByText('Section Title').parentElement;
    expect(titleContainer).toHaveClass('border-b', 'border-gray-700');
  });

  it('applies additional className', () => {
    const { container } = render(
      <Section className="custom-class">
        <div>Content</div>
      </Section>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
}); 