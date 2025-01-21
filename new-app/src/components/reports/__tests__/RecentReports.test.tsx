import { ReportsProvider } from '@/context/ReportsContext';
import { Report } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { RecentReports } from '../RecentReports';

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
    location_and_period: 'General Channel • Last Hour',
    body: 'Test report content',
    sources: [],
    raw_response: 'Test report content',
    timestamp: '2024-01-20T10:00:00Z'
  }
};

const mockFetchReports = jest.fn();

jest.mock('@/context/ReportsContext', () => ({
  ...jest.requireActual('@/context/ReportsContext'),
  useReports: () => ({
    reports: [{ date: '2024-01-20', reports: [mockReport] }],
    loading: false,
    error: null,
    fetchReports: mockFetchReports,
    addReport: jest.fn(),
    updateReport: jest.fn(),
    deleteReport: jest.fn(),
    setCurrentReport: jest.fn(),
  })
}));

describe('RecentReports', () => {
  beforeEach(() => {
    mockFetchReports.mockClear();
  });

  it('renders reports correctly', () => {
    render(
      <ReportsProvider>
        <RecentReports />
      </ReportsProvider>
    );

    expect(screen.getByText('Test Report')).toBeInTheDocument();
    expect(screen.getByText('#general • General Channel • Last Hour')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    jest.spyOn(require('@/context/ReportsContext'), 'useReports').mockImplementation(() => ({
      reports: [],
      loading: true,
      error: null,
      fetchReports: mockFetchReports,
      addReport: jest.fn(),
      updateReport: jest.fn(),
      deleteReport: jest.fn(),
      setCurrentReport: jest.fn(),
    }));

    render(
      <ReportsProvider>
        <RecentReports />
      </ReportsProvider>
    );

    expect(screen.getByTestId('report-skeleton')).toBeInTheDocument();
  });

  it('shows error state with retry option', () => {
    jest.spyOn(require('@/context/ReportsContext'), 'useReports').mockImplementation(() => ({
      reports: [],
      loading: false,
      error: 'Failed to fetch reports',
      fetchReports: mockFetchReports,
      addReport: jest.fn(),
      updateReport: jest.fn(),
      deleteReport: jest.fn(),
      setCurrentReport: jest.fn(),
    }));

    render(
      <ReportsProvider>
        <RecentReports />
      </ReportsProvider>
    );

    expect(screen.getByText('Failed to fetch reports')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockFetchReports).toHaveBeenCalled();
  });

  it('shows empty state', () => {
    jest.spyOn(require('@/context/ReportsContext'), 'useReports').mockImplementation(() => ({
      reports: [],
      loading: false,
      error: null,
      fetchReports: mockFetchReports,
      addReport: jest.fn(),
      updateReport: jest.fn(),
      deleteReport: jest.fn(),
      setCurrentReport: jest.fn(),
    }));

    render(
      <ReportsProvider>
        <RecentReports />
      </ReportsProvider>
    );

    expect(screen.getByText('No reports yet')).toBeInTheDocument();
  });
}); 