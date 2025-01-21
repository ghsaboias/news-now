import { ReactNode } from 'react';

interface SplitViewProps {
  sidebar: ReactNode;
  main: ReactNode;
}

export function SplitView({ sidebar, main }: SplitViewProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-900">
      <aside className="w-full md:w-[30%] md:max-w-md border-r border-gray-800">
        {sidebar}
      </aside>
      <main className="flex-1 min-w-0">
        {main}
      </main>
    </div>
  );
} 