import { ReactNode } from 'react';

export interface SplitViewProps {
  sidebarContent: ReactNode;
  mainContent: ReactNode;
}

export function SplitView({ sidebarContent, mainContent }: SplitViewProps) {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-[2000px] mx-auto">
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Sidebar - full width on mobile, fixed width on desktop */}
          <div className="
            w-full lg:w-[400px] lg:min-w-[400px] 
            overflow-y-auto 
            border-b lg:border-b-0 lg:border-r border-gray-800 
            bg-gray-900/50 backdrop-blur-sm
          ">
            <div className="p-4 lg:p-6 space-y-4">
              {sidebarContent}
            </div>
          </div>
          
          {/* Main content - takes remaining space */}
          <div className="
            flex-1 
            overflow-y-auto 
            bg-gray-900/30 backdrop-blur-sm
          ">
            <div className="p-4 lg:p-6 space-y-4">
              {mainContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 