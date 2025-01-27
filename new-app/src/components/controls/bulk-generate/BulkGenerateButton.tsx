import { Button } from '@/components/common/Button';
import { useBulkGenerate } from '@/hooks/useBulkGenerate';
import { useState } from 'react';
import { TimeSelect, TimeframeOption, TimeframeValue } from '../TimeSelect';
import { MinMessagesInput } from './MinMessagesInput';
import { ProgressDisplay } from './ProgressDisplay';

const DEFAULT_MIN_MESSAGES = 10;

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { label: '1 hour', value: '1h' },
  { label: '4 hours', value: '4h' },
  { label: '24 hours', value: '24h' }
];

export function BulkGenerateButton() {
  const { isLoading, status, channels, error, generate } = useBulkGenerate();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeValue>(TIMEFRAME_OPTIONS[0].value);
  const [minMessages, setMinMessages] = useState(DEFAULT_MIN_MESSAGES);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls Section */}
      <div className={`space-y-4 transition-opacity duration-DEFAULT ${isLoading ? 'opacity-50' : ''}`}>
        {/* Time Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Time Range</label>
          <TimeSelect
            options={TIMEFRAME_OPTIONS}
            value={selectedTimeframe}
            onChange={setSelectedTimeframe}
            disabled={isLoading}
            className="w-full"
          />
        </div>

        {/* Minimum Messages Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Minimum Messages</label>
          <MinMessagesInput
            value={minMessages}
            onChange={setMinMessages}
            disabled={isLoading}
            className="w-full sm:w-auto"
          />
          <p className="text-xs text-gray-400">
            Minimum number of messages required to generate a report
          </p>
        </div>

        {/* Generate Button */}
        <Button
          variant="primary"
          onClick={() => generate({ timeframe: selectedTimeframe, minMessages })}
          disabled={isLoading}
          loading={isLoading}
          size="lg"
          className="w-full transition-transform duration-DEFAULT active:scale-[0.99]"
        >
          {isLoading ? 'Generating Reports...' : 'Generate Reports'}
        </Button>
      </div>

      {/* Progress Section */}
      <div className={`transition-opacity duration-DEFAULT ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
        <ProgressDisplay
          status={status}
          channels={channels}
          error={error}
        />
      </div>
    </div>
  );
} 