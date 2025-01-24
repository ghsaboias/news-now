import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock component that throws an error
function BrokenComponent(): React.ReactNode {
  throw new Error('Test error');
  // Add return to satisfy TypeScript, though it will never be reached
  return <div />;
}

describe('ErrorBoundary', () => {
  // Prevent console.error from cluttering test output
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'group').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders ErrorMessage when child throws', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders fallback component when provided and error occurs', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error view</div>}>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error view')).toBeInTheDocument();
  });

  it('resets error state when retry is clicked', () => {
    const TestComponent = ({ shouldThrow = true }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Working content</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verify error state
    expect(screen.getByText('Test error')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    // Update props to not throw and click retry
    rerender(
      <ErrorBoundary>
        <TestComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    fireEvent.click(retryButton);

    // Verify recovery
    expect(screen.getByText('Working content')).toBeInTheDocument();
  });
}); 