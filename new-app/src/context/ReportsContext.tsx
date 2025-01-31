'use client';

import type { Report, ReportGroup } from '@/types/report';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface ReportsContextType {
  reports: ReportGroup[];
  currentReport: Report | null;
  loading: boolean;
  error: string | null;
  setCurrentReport: (report: Report | null) => void;
  fetchReports: () => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  updateReport: (report: Report) => Promise<void>;
  addReport: (report: Report) => Promise<void>;
  findReportContext: (channelId: string, timeframe: string) => Promise<{
    primary: Report | null;
    related: Report[];
  }>;
}

const ReportsContext = createContext<ReportsContextType | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<ReportGroup[]>([]);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      setReports(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch reports';
      setError(message);
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteReport = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete report');
      await fetchReports(); // Refresh the reports list
    } catch (error) {
      console.error('Failed to delete report:', error);
      throw error;
    }
  }, [fetchReports]);

  const updateReport = useCallback(async (report: Report) => {
    try {
      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });
      if (!response.ok) throw new Error('Failed to update report');
      await fetchReports(); // Refresh the reports list
    } catch (error) {
      console.error('Failed to update report:', error);
      throw error;
    }
  }, [fetchReports]);

  const addReport = useCallback(async (report: Report) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      });
      if (!response.ok) throw new Error('Failed to add report');
      await fetchReports(); // Refresh the reports list
    } catch (error) {
      console.error('Failed to add report:', error);
      throw error;
    }
  }, [fetchReports]);

  const findReportContext = useCallback(async (channelId: string, timeframe: string) => {
    try {
      const response = await fetch(`/api/reports/context?channelId=${channelId}&timeframe=${timeframe}`);
      if (!response.ok) throw new Error('Failed to fetch report context');
      const data = await response.json();
      return {
        primary: data.primary,
        related: data.related
      };
    } catch (error) {
      console.error('Failed to fetch report context:', error);
      return {
        primary: null,
        related: []
      };
    }
  }, []);

  return (
    <ReportsContext.Provider
      value={{
        reports,
        currentReport,
        loading,
        error,
        setCurrentReport,
        fetchReports,
        deleteReport,
        updateReport,
        addReport,
        findReportContext
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
} 