import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { Section } from '../Section';

describe('Section', () => {
  it('renders title and content', () => {
    render(
      <Section title="Section Title">
        <div>Section Content</div>
      </Section>
    );

    expect(screen.getByText('Section Title')).toBeInTheDocument();
    expect(screen.getByText('Section Content')).toBeInTheDocument();
  });

  it('applies divider when specified', () => {
    render(
      <Section title="Section Title" divider>
        <div>Section Content</div>
      </Section>
    );

    const titleContainer = screen.getByText('Section Title').parentElement?.parentElement;
    expect(titleContainer).toHaveClass('border-b', 'border-gray-700');
  });

  it('applies additional className', () => {
    render(
      <Section title="Section Title" className="custom-class">
        <div>Section Content</div>
      </Section>
    );

    const section = screen.getByText('Section Title').closest('.rounded-xl');
    expect(section).toHaveClass('custom-class');
  });

  it('handles collapsible behavior', () => {
    render(
      <Section title="Section Title" collapsible defaultExpanded={false}>
        <div>Section Content</div>
      </Section>
    );

    // Initially collapsed
    expect(screen.queryByText('Section Content')).not.toBeInTheDocument();

    // Click to expand
    const button = screen.getByRole('button', { name: /Section Title/i });
    fireEvent.click(button);
    expect(screen.getByText('Section Content')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(button);
    expect(screen.queryByText('Section Content')).not.toBeInTheDocument();
  });

  it('applies variant styles', () => {
    render(
      <Section title="Section Title" variant="raised">
        <div>Section Content</div>
      </Section>
    );

    const section = screen.getByText('Section Title').closest('.rounded-xl');
    expect(section).toHaveClass('bg-gray-700/50', 'backdrop-blur-sm');
  });
}); 