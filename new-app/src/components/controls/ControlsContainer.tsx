import Link from 'next/link';
import { ReactNode } from 'react';
import { Stack } from '../layout/Stack';

interface ControlsContainerProps {
  children: ReactNode;
}

export function ControlsContainer({ children }: ControlsContainerProps) {
  return (
    <Stack className="h-full">
      {/* Sticky Header */}
      <div className="flex-none">
        <div className="flex items-center justify-center p-4">
          <Link href="/">
            <h1 className="text-2xl font-bold text-white">NewsNow</h1>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-none bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 mb-6">
        <Stack spacing="default">{children}</Stack>
      </div>
    </Stack>
  );
}