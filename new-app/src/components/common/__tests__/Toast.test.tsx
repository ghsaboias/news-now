import { act, fireEvent, render, screen } from '@testing-library/react';
import { Toast } from '../Toast';

jest.useFakeTimers();

describe('Toast', () => {
  it('renders message and close button', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('auto-closes after duration', () => {
    const onClose = jest.fn();
    render(<Toast message="Test message" onClose={onClose} duration={1000} />);
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(onClose).toHaveBeenCalled();
  });
}); 