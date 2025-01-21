import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { GenerateButton } from '../GenerateButton';

describe('GenerateButton', () => {
  const onClick = jest.fn();

  beforeEach(() => {
    onClick.mockClear();
  });

  it('renders with default state', () => {
    render(<GenerateButton onClick={onClick} />);
    expect(screen.getByText('Create Report')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<GenerateButton onClick={onClick} loading />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Processing...').parentElement?.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(<GenerateButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<GenerateButton onClick={onClick} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading is true', () => {
    render(<GenerateButton onClick={onClick} loading />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    render(<GenerateButton onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    render(<GenerateButton onClick={onClick} loading />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
}); 