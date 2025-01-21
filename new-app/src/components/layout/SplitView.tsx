import { ReactNode } from 'react';

export interface SplitViewProps {
  sidebarContent: ReactNode;
  mainContent: ReactNode;
}

export function SplitView({ sidebarContent, mainContent }: SplitViewProps) {
  return (
    <div className="flex h-screen">
      <div className="w-96 overflow-y-auto border-r border-gray-800 bg-gray-900">
        {sidebarContent}
      </div>
      <div className="flex-1 overflow-y-auto">
        {mainContent}
      </div>
    </div>
  );
} 