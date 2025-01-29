import { ReportsProvider } from '@/context/ReportsContext';
import { ToastProvider } from '@/context/ToastContext';
import { Report } from '@/types';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ReportView } from '../ReportView';

const mockReport: Report = {
  id: '1',
  channelId: 'ch1',
  channelName: 'general',
  timestamp: '2024-01-20T10:00:00Z',
  timeframe: {
    type: '1h',
    start: '2024-01-20T09:00:00Z',
    end: '2024-01-20T10:00:00Z'
  },
  messageCount: 10,
  summary: {
    headline: 'Test Report',
    location: 'General Channel',
    body: 'First paragraph\n\nSecond paragraph',
    timestamp: '2024-01-20T10:00:00Z',
    sources: [],
    raw_response: '',
  }
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <ReportsProvider>
        {ui}
      </ReportsProvider>
    </ToastProvider>
  );
};

describe('ReportView', () => {
  it('renders report content correctly', () => {
    renderWithProviders(<ReportView report={mockReport} />);

    expect(screen.getByText('Test Report')).toBeInTheDocument();
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('General Channel • Last Hour')).toBeInTheDocument();
    expect(screen.getByText('First paragraph')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph')).toBeInTheDocument();
  });

  it('has sticky header with correct styling', () => {
    renderWithProviders(<ReportView report={mockReport} />);

    const header = screen.getByText('Test Report').closest('.sticky');
    expect(header).toHaveClass('top-0', 'z-10');
  });

  it('shows action buttons with correct titles', () => {
    renderWithProviders(<ReportView report={mockReport} />);

    expect(screen.getByTitle('Copy Report')).toBeInTheDocument();
    expect(screen.getByTitle('Delete Report')).toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    renderWithProviders(<ReportView report={mockReport} />);

    const date = new Date(mockReport.timestamp);
    expect(screen.getByText(date.toLocaleTimeString())).toBeInTheDocument();
  });
}); 