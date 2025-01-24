import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { ReportsProvider } from '../../../context/ReportsContext';
import { ToastProvider } from '../../../context/ToastContext';
import { RecentReports } from '../RecentReports';

const mockReport = {
  id: '1',
  channelName: 'general',
  messageCount: 10,
  timestamp: new Date('2024-01-18T12:00:00Z').toISOString(),
  timeframe: { type: '24h' },
  summary: {
    headline: 'Test report content',
    location_and_period: 'Test location and period',
    body: 'Test body',
    sources: ['Test source']
  }
};

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <ReportsProvider>
        {ui}
      </ReportsProvider>
    </ToastProvider>
  );
}

describe('RecentReports', () => {
  beforeEach(() => {
    // Mock fetch to return empty reports initially
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  it('renders reports correctly', async () => {
    // Mock fetch to return our test report
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          date: '2024-01-18',
          reports: [mockReport]
        }
      ])
    });

    renderWithProviders(<RecentReports />);
    
    // First verify loading state
    expect(screen.getByTestId('report-skeleton')).toBeInTheDocument();
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Test report content')).toBeInTheDocument();
    });
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('10 msgs')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    // Mock fetch to return an error
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch reports'));

    renderWithProviders(<RecentReports />);
    
    // First verify loading state
    expect(screen.getByTestId('report-skeleton')).toBeInTheDocument();
    
    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch reports')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    // Mock fetch to return empty reports
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    renderWithProviders(<RecentReports />);
    
    // First verify loading state
    expect(screen.getByTestId('report-skeleton')).toBeInTheDocument();
    
    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText('No reports yet')).toBeInTheDocument();
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
}); 