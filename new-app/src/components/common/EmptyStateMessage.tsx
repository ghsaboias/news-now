'use client';

import { TimeframeValue } from '@/components/controls/TimeSelect';
import { AlertCircle } from 'react-feather';

interface EmptyStateMessageProps {
    channelName: string;
    timeframe: TimeframeValue;
}

export function EmptyStateMessage({ channelName, timeframe }: EmptyStateMessageProps) {
    const timeframeText = timeframe === '1h' ? 'hour' : timeframe === '4h' ? '4 hours' : '24 hours';

    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
            <div className="flex justify-center mb-4">
                <AlertCircle className="text-amber-400 h-12 w-12" />
            </div>
            <h3 className="text-xl font-medium text-gray-200 mb-2">No Messages Found</h3>
            <p className="text-gray-400 mb-4">
                There were no messages in <span className="font-medium text-gray-300">{channelName}</span> during the last {timeframeText}.
            </p>
            <div className="bg-gray-700/50 p-4 rounded text-left">
                <h4 className="text-gray-300 font-medium mb-2">Suggestions:</h4>
                <ul className="text-gray-400 list-disc pl-5 space-y-1">
                    <li>Try selecting a different timeframe</li>
                    <li>Check another channel</li>
                    <li>Verify that the channel is active</li>
                </ul>
            </div>
        </div>
    );
} 