import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ControlsContainer } from '../ControlsContainer';

// Mock next/link since we're using it in the component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('ControlsContainer', () => {
  it('renders the NewsNow title with link', () => {
    render(<ControlsContainer />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { name: 'NewsNow' })).toBeInTheDocument();
  });

  it('renders main controls section when provided', () => {
    render(<ControlsContainer mainControls={<div>Main Controls Content</div>} />);
    expect(screen.getByText('Main Controls Content')).toBeInTheDocument();
  });

  it('renders bulk controls section when provided', () => {
    render(
      <ControlsContainer
        bulkControls={<div>Bulk Controls Content</div>}
      />
    );
    
    expect(screen.getByText('Bulk Generation')).toBeInTheDocument();
    // Initially bulk controls should be collapsed
    expect(screen.queryByText('Bulk Controls Content')).not.toBeInTheDocument();

    // Click to expand bulk controls
    const bulkButton = screen.getByRole('button', { name: /Bulk Generation/i });
    fireEvent.click(bulkButton);
    expect(screen.getByText('Bulk Controls Content')).toBeInTheDocument();
  });

  it('renders recent reports section when provided', () => {
    render(
      <ControlsContainer
        recentReports={<div>Recent Reports Content</div>}
      />
    );

    expect(screen.getByText('Recent Reports')).toBeInTheDocument();
    expect(screen.getByText('Recent Reports Content')).toBeInTheDocument();
  });

  it('maintains section expansion state independently', () => {
    render(
      <ControlsContainer
        bulkControls={<div>Bulk Controls Content</div>}
        recentReports={<div>Recent Reports Content</div>}
      />
    );

    // Initially bulk controls should be collapsed
    expect(screen.queryByText('Bulk Controls Content')).not.toBeInTheDocument();
    expect(screen.getByText('Recent Reports Content')).toBeInTheDocument();

    // Click to expand bulk controls
    const bulkButton = screen.getByRole('button', { name: /Bulk Generation/i });
    fireEvent.click(bulkButton);
    expect(screen.getByText('Bulk Controls Content')).toBeInTheDocument();
    expect(screen.getByText('Recent Reports Content')).toBeInTheDocument();

    // Click to collapse bulk controls
    fireEvent.click(bulkButton);
    expect(screen.queryByText('Bulk Controls Content')).not.toBeInTheDocument();
    expect(screen.getByText('Recent Reports Content')).toBeInTheDocument();
  });

  it('applies correct layout classes for scrolling', () => {
    const { container } = render(<ControlsContainer />);

    // Main container
    expect(container.firstChild).toHaveClass('h-full');

    // Scrollable content container
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toHaveClass('flex-1', 'overflow-y-auto', 'min-h-0');
  });
}); 