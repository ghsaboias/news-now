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
  const { isLoading, status, channels, generate } = useBulkGenerate();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeValue>(TIMEFRAME_OPTIONS[0].value);
  const [minMessages, setMinMessages] = useState(DEFAULT_MIN_MESSAGES);

  return (
    <div className="space-y-4">
      <div className={`space-y-4 transition-opacity duration-DEFAULT ${isLoading ? 'opacity-50' : ''}`}>
        <TimeSelect
          options={TIMEFRAME_OPTIONS}
          value={selectedTimeframe}
          onChange={setSelectedTimeframe}
          disabled={isLoading}
        />
        
        <MinMessagesInput
          value={minMessages}
          onChange={setMinMessages}
          disabled={isLoading}
        />

        <Button
          variant="primary"
          onClick={() => generate({ timeframe: selectedTimeframe, minMessages })}
          disabled={isLoading}
          loading={isLoading}
          size="lg"
          className="w-full transition-transform duration-DEFAULT"
        >
          {isLoading ? 'Generating Reports...' : 'Generate Reports'}
        </Button>
      </div>

      <div className={`transition-opacity duration-DEFAULT ${status === 'idle' ? 'opacity-0' : 'opacity-100'}`}>
        <ProgressDisplay
          status={status}
          channels={channels}
        />
      </div>
    </div>
  );
} 