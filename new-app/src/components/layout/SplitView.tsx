import { ReactNode, useState } from 'react';

export interface SplitViewProps {
  sidebarContent: ReactNode;
  mainContent: ReactNode;
}

export function SplitView({ sidebarContent, mainContent }: SplitViewProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-[2000px] mx-auto">
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Desktop Sidebar */}
          <div className="
            hidden lg:block
            w-[400px] min-w-[400px] 
            overflow-y-auto 
            border-r border-gray-800 
            bg-gray-900/50 backdrop-blur-sm
          ">
            <div className="p-6 space-y-4">
              {sidebarContent}
            </div>
          </div>

          {/* Main content */}
          <div className="
            flex-1 
            overflow-y-auto 
            bg-gray-900/30 backdrop-blur-sm
          ">
            <div className="p-4 lg:p-6 space-y-4">
              {mainContent}
            </div>
          </div>

          {/* Mobile Floating Action Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="
              lg:hidden fixed right-4 bottom-4
              w-14 h-14 rounded-full
              bg-blue-600 text-white
              flex items-center justify-center
              shadow-lg hover:bg-blue-700
              transition-colors
            "
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Mobile Slide Panel */}
          <div className={`
            lg:hidden fixed inset-y-0 right-0
            w-[90vw] max-w-[400px]
            bg-gray-900/95 backdrop-blur-md
            transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
            border-l border-gray-800
            z-50
          `}>
            <div className="relative h-full">
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="p-4 pt-14 h-full overflow-y-auto">
                {sidebarContent}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 