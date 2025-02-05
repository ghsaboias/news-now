import Link from 'next/link';
import { ReactNode } from 'react';
import { Section } from '../layout/Section';
import { Stack } from '../layout/Stack';

interface ControlsContainerProps {
  /** Main controls that are always visible (channel select, time select, etc.) */
  mainControls?: ReactNode;
  /** Bulk generation controls */
  bulkControls?: ReactNode;
}

export function ControlsContainer({
  mainControls,
  bulkControls,
}: ControlsContainerProps) {
  return (
    <Stack>
      {/* Sticky Header */}
      <div className="flex-none">
        <div className="flex items-center justify-center p-4">
          <Link href="/">
            <h1 className="text-2xl font-bold text-white">NewsNow</h1>
          </Link>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Main Controls - Always Visible */}
        {mainControls && (
          <div className="flex-none bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6">
            <Stack spacing="default">
              {mainControls}
            </Stack>
          </div>
        )}

        {/* Bulk Generate Section */}
        {bulkControls && (
          <Section
            title="Bulk Generation"
            collapsible
            defaultExpanded={false}
            variant="raised"
          >
            {bulkControls}
          </Section>
        )}
      </div>
    </Stack>
  );
} 