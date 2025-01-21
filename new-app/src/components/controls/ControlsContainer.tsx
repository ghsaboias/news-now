import React, { ReactNode, useState } from 'react';
import { ChevronDown, ChevronUp } from 'react-feather';

interface SectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

function Section({ title, children, defaultExpanded = true }: SectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-medium text-gray-400 hover:text-white transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isExpanded && children}
    </div>
  );
}

interface ControlsContainerProps {
  children: ReactNode;
}

export function ControlsContainer({ children }: ControlsContainerProps) {
  // Split children into arrays based on their position
  const childrenArray = React.Children.toArray(children);
  const controls = childrenArray.slice(0, 3); // Channel select, time select, and generate button
  const bulkControls = childrenArray.slice(3, 4); // Bulk generate section
  const recentReports = childrenArray.slice(4); // Recent reports section

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Header */}
      <div className="flex-none">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">News Now</h1>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Main Controls - Always Visible */}
        <div className="flex-none bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 space-y-4 mb-6">
          {controls}
        </div>

        {/* Scrollable Sections */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-6">
          {/* Bulk Generate Section */}
          <Section title="Bulk Generation" defaultExpanded={false}>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
              {bulkControls}
            </div>
          </Section>

          {/* Recent Reports Section */}
          <Section title="Recent Reports">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
              {recentReports}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
} 