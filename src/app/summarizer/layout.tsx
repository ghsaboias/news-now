import { ReportsProvider } from '@/context/ReportsContext';
import { ReactNode } from 'react';

// Log when the layout is rendered
console.log('[SummarizerLayout] Initializing');
const startTime = performance.now();

export default function SummarizerLayout({
  children,
}: {
  children: ReactNode;
}) {
  console.log(`[SummarizerLayout] Render completed in ${performance.now() - startTime}ms`);
  return <ReportsProvider>{children}</ReportsProvider>;
} 