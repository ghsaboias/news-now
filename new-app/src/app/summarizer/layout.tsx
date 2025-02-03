import { ReportsProvider } from '@/context/ReportsContext';
import { ReactNode } from 'react';

export default function SummarizerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ReportsProvider>{children}</ReportsProvider>;
} 