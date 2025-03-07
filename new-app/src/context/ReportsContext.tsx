'use client';

import type { Report } from '@/types';
import { createContext, ReactNode, useContext, useState } from 'react';

interface ReportsContextType {
  currentReport: Report | null;
  setCurrentReport: (report: Report | null) => void;
}

const ReportsContext = createContext<ReportsContextType | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [currentReport, setCurrentReport] = useState<Report | null>(null);

  return (
    <ReportsContext.Provider value={{ currentReport, setCurrentReport }}>
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