'use client';

import { Report, ReportGroup } from '@/types';
import { createContext, ReactNode, useCallback, useContext, useReducer } from 'react';

interface ReportsState {
  reports: ReportGroup[];
  loading: boolean;
  error: string | null;
  currentReport: Report | null;
}

type ReportsAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: ReportGroup[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_REPORT'; payload: Report }
  | { type: 'UPDATE_REPORT'; payload: Report }
  | { type: 'DELETE_REPORT'; payload: string }
  | { type: 'SET_CURRENT_REPORT'; payload: Report | null };

const initialState: ReportsState = {
  reports: [],
  loading: false,
  error: null,
  currentReport: null,
};

function reportsReducer(state: ReportsState, action: ReportsAction): ReportsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, reports: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_REPORT':
      return {
        ...state,
        reports: addReportToGroups(state.reports, action.payload),
      };
    case 'UPDATE_REPORT':
      return {
        ...state,
        reports: updateReportInGroups(state.reports, action.payload),
      };
    case 'DELETE_REPORT':
      return {
        ...state,
        reports: deleteReportFromGroups(state.reports, action.payload),
      };
    case 'SET_CURRENT_REPORT':
      return { ...state, currentReport: action.payload };
    default:
      return state;
  }
}

function addReportToGroups(groups: ReportGroup[], report: Report): ReportGroup[] {
  const date = new Date(report.timestamp).toISOString().split('T')[0];
  const existingGroup = groups.find(g => g.date === date);

  if (existingGroup) {
    return groups.map(group =>
      group.date === date
        ? { ...group, reports: [report, ...group.reports] }
        : group
    );
  }

  return [{ date, reports: [report] }, ...groups];
}

function updateReportInGroups(groups: ReportGroup[], report: Report): ReportGroup[] {
  return groups.map(group => ({
    ...group,
    reports: group.reports.map(r => (r.id === report.id ? report : r)),
  }));
}

function deleteReportFromGroups(groups: ReportGroup[], reportId: string): ReportGroup[] {
  return groups
    .map(group => ({
      ...group,
      reports: group.reports.filter(r => r.id !== reportId),
    }))
    .filter(group => group.reports.length > 0);
}

interface ReportsContextType extends ReportsState {
  fetchReports: () => Promise<void>;
  addReport: (report: Report) => void;
  updateReport: (report: Report) => void;
  deleteReport: (id: string) => void;
  setCurrentReport: (report: Report | null) => void;
}

const ReportsContext = createContext<ReportsContextType | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reportsReducer, initialState);

  const fetchReports = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: error instanceof Error ? error.message : 'Failed to fetch reports' });
    }
  }, []);

  const addReport = useCallback((report: Report) => {
    dispatch({ type: 'ADD_REPORT', payload: report });
  }, []);

  const updateReport = useCallback((report: Report) => {
    dispatch({ type: 'UPDATE_REPORT', payload: report });
  }, []);

  const deleteReport = useCallback((id: string) => {
    dispatch({ type: 'DELETE_REPORT', payload: id });
  }, []);

  const setCurrentReport = useCallback((report: Report | null) => {
    dispatch({ type: 'SET_CURRENT_REPORT', payload: report });
  }, []);

  return (
    <ReportsContext.Provider
      value={{
        ...state,
        fetchReports,
        addReport,
        updateReport,
        deleteReport,
        setCurrentReport,
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