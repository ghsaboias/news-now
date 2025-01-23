import { fireEvent, render, screen } from '@testing-library/react';
import { ControlsContainer } from '../ControlsContainer';

// Mock next/link since we're using it in the component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('ControlsContainer', () => {
  const mockMainControls = <div data-testid="main-controls">Main Controls</div>;
  const mockBulkControls = <div data-testid="bulk-controls">Bulk Controls</div>;
  const mockRecentReports = <div data-testid="recent-reports">Recent Reports</div>;

  it('renders the NewsNow title with link', () => {
    render(<ControlsContainer />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { name: 'NewsNow' })).toBeInTheDocument();
  });

  it('renders main controls section when provided', () => {
    render(<ControlsContainer mainControls={mockMainControls} />);
    
    expect(screen.getByTestId('main-controls')).toBeInTheDocument();
  });

  it('renders bulk controls section when provided', () => {
    render(<ControlsContainer bulkControls={mockBulkControls} />);
    
    expect(screen.getByText('Bulk Generation')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-controls')).toBeInTheDocument();
  });

  it('renders recent reports section when provided', () => {
    render(<ControlsContainer recentReports={mockRecentReports} />);
    
    expect(screen.getByText('Recent Reports')).toBeInTheDocument();
    expect(screen.getByTestId('recent-reports')).toBeInTheDocument();
  });

  it('expands and collapses sections when clicked', () => {
    render(
      <ControlsContainer
        bulkControls={mockBulkControls}
        recentReports={mockRecentReports}
      />
    );

    // Bulk controls section starts collapsed
    expect(screen.queryByTestId('bulk-controls')).not.toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(screen.getByText('Bulk Generation'));
    expect(screen.getByTestId('bulk-controls')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(screen.getByText('Bulk Generation'));
    expect(screen.queryByTestId('bulk-controls')).not.toBeInTheDocument();
  });

  it('maintains section expansion state independently', () => {
    render(
      <ControlsContainer
        bulkControls={mockBulkControls}
        recentReports={mockRecentReports}
      />
    );

    // Recent reports section starts expanded, bulk controls collapsed
    expect(screen.getByTestId('recent-reports')).toBeInTheDocument();
    expect(screen.queryByTestId('bulk-controls')).not.toBeInTheDocument();

    // Toggle bulk controls
    fireEvent.click(screen.getByText('Bulk Generation'));
    expect(screen.getByTestId('bulk-controls')).toBeInTheDocument();
    expect(screen.getByTestId('recent-reports')).toBeInTheDocument();

    // Toggle recent reports
    fireEvent.click(screen.getByText('Recent Reports'));
    expect(screen.queryByTestId('recent-reports')).not.toBeInTheDocument();
    expect(screen.getByTestId('bulk-controls')).toBeInTheDocument();
  });

  it('applies correct layout classes for scrolling', () => {
    const { container } = render(<ControlsContainer />);
    
    // Main container
    expect(container.firstChild).toHaveClass('h-full', 'flex', 'flex-col');
    
    // Scrollable content container
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toHaveClass('flex-1', 'min-h-0', 'space-y-6');
  });
}); 