import { Report } from '@/types';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { ReportsProvider, useReports } from '../ReportsContext';

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
    sources: [],
    raw_response: '',
    body: 'Test report content',
    timestamp: '2024-01-20T10:00:00Z'
  }
};

const mockReportGroup = {
  date: '2024-01-20',
  reports: [mockReport]
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <ReportsProvider>{children}</ReportsProvider>
);

describe('ReportsContext', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('provides initial state', () => {
    const { result } = renderHook(() => useReports(), { wrapper });

    expect(result.current.reports).toEqual([]);
    expect(result.current.currentReport).toBeNull();
    expect(result.current.loading).toBeFalsy();
    expect(result.current.error).toBeNull();
  });

  it('fetches reports successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockReportGroup],
    });

    const { result } = renderHook(() => useReports(), { wrapper });

    await act(async () => {
      await result.current.fetchReports();
    });

    await waitFor(() => {
      expect(result.current.reports).toEqual([mockReportGroup]);
      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });
  });

  it('handles fetch error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useReports(), { wrapper });

    await act(async () => {
      await result.current.fetchReports();
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch reports');
      expect(result.current.loading).toBeFalsy();
    });
  });

  it('adds a report successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    const { result } = renderHook(() => useReports(), { wrapper });

    await act(async () => {
      await result.current.addReport(mockReport);
    });

    await waitFor(() => {
      expect(result.current.reports[0].reports).toContainEqual(mockReport);
      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });
  });

  it('updates a report successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    const { result } = renderHook(() => useReports(), { wrapper });

    // First add a report
    await act(async () => {
      await result.current.addReport(mockReport);
    });

    const updatedReport = {
      ...mockReport,
      summary: { ...mockReport.summary, headline: 'Updated Report' }
    };

    await act(async () => {
      await result.current.updateReport(updatedReport);
    });

    await waitFor(() => {
      const report = result.current.reports[0].reports[0];
      expect(report.summary.headline).toBe('Updated Report');
      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });
  });

  it('deletes a report successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    const { result } = renderHook(() => useReports(), { wrapper });

    // First add a report
    await act(async () => {
      await result.current.addReport(mockReport);
    });

    await act(async () => {
      await result.current.deleteReport(mockReport.id);
    });

    await waitFor(() => {
      expect(result.current.reports).toHaveLength(0);
      expect(result.current.loading).toBeFalsy();
      expect(result.current.error).toBeNull();
    });
  });

  it('sets current report', () => {
    const { result } = renderHook(() => useReports(), { wrapper });

    act(() => {
      result.current.setCurrentReport(mockReport);
    });

    expect(result.current.currentReport).toEqual(mockReport);
  });
}); 