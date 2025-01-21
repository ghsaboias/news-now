import { useReports } from '@/context/ReportsContext';
import { ActivityThreshold, ChannelActivity } from '@/types';
import { useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Loader } from 'react-feather';

const DEFAULT_THRESHOLDS: ActivityThreshold[] = [
    { timeframe: '1h', minMessages: 3 },
    { timeframe: '4h', minMessages: 6 },
    { timeframe: '24h', minMessages: 10 },
];

const TIMEFRAME_OPTIONS = [
    { value: '1h', label: 'Last Hour' },
    { value: '4h', label: 'Last 4 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
];

interface BulkGenerateButtonProps {
    onComplete?: () => void;
}

export function BulkGenerateButton({ onComplete }: BulkGenerateButtonProps) {
    const { setCurrentReport } = useReports();
    const [loading, setLoading] = useState(false);
    const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '4h' | '24h'>('1h');
    const [minMessages, setMinMessages] = useState(3);
    const [isProgressExpanded, setIsProgressExpanded] = useState(true);
    const hasSelectedFirstReportRef = useRef(false);
    const [progress, setProgress] = useState<{
        status: 'idle' | 'scanning' | 'complete' | 'error';
        channels: ChannelActivity[];
    }>({
        status: 'idle',
        channels: [],
    });

    const resetProgress = () => {
        setProgress({
            status: 'idle',
            channels: [],
        });
    };

    const handleGenerate = async () => {
        setLoading(true);
        setProgress({ status: 'scanning', channels: [] });
        hasSelectedFirstReportRef.current = false;

        try {
            const eventSource = new EventSource(`/api/reports/bulk-generate?timeframe=${selectedTimeframe}&minMessages=${minMessages}`);

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'scanning':
                        // Update channel list and status
                        setProgress(prev => ({
                            ...prev,
                            channels: data.channels,
                        }));
                        break;
                    
                    case 'report':
                        // Update channel status and select first report
                        if (!hasSelectedFirstReportRef.current) {
                            setCurrentReport(data.report);
                            hasSelectedFirstReportRef.current = true;
                        }
                        setProgress(prev => ({
                            ...prev,
                            channels: prev.channels.map(ch => 
                                ch.channelId === data.report.channelId
                                    ? { ...ch, status: 'success', messageCount: data.report.messageCount }
                                    : ch
                            )
                        }));
                        onComplete?.();
                        break;
                    
                    case 'complete':
                        setProgress(prev => ({
                            ...prev,
                            status: 'complete',
                            channels: data.channels,
                        }));
                        eventSource.close();
                        onComplete?.();
                        break;
                    
                    case 'error':
                        setProgress(prev => ({
                            ...prev,
                            status: 'error',
                        }));
                        eventSource.close();
                        break;
                }
            };

            eventSource.onerror = () => {
                setProgress(prev => ({ ...prev, status: 'error' }));
                eventSource.close();
            };
        } catch (err) {
            console.error('Error generating reports:', err);
            setProgress(prev => ({ ...prev, status: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="w-full">
                <div className="grid grid-cols-3 gap-2">
                    {TIMEFRAME_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedTimeframe(option.value as '1h' | '4h' | '24h')}
                            disabled={loading}
                            className={`
                                w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all
                                ${selectedTimeframe === option.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white'
                                }
                                disabled:opacity-50 disabled:cursor-not-allowed
                            `}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full">
                <label htmlFor="minMessages" className="block text-sm font-medium text-gray-300 mb-2">
                    Minimum Messages
                </label>
                <input
                    id="minMessages"
                    type="number"
                    min="1"
                    value={minMessages}
                    onChange={(e) => setMinMessages(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={loading}
                    className="
                        w-full px-4 py-2.5 bg-gray-800/80 text-white rounded-lg
                        border border-gray-700 focus:border-blue-500
                        transition-all focus:outline-none focus:ring-2 focus:ring-blue-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                    "
                />
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="
                    w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium
                    transition-all hover:bg-blue-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                "
            >
                {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Generating Reports...</span>
                    </div>
                ) : (
                    'Create Reports'
                )}
            </button>

            {/* Progress Section */}
            {progress.status !== 'idle' && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className={`flex items-center justify-between ${isProgressExpanded ? 'mb-4' : ''}`}>
                        <div className="flex items-center space-x-2">
                            {progress.status === 'scanning' && <Loader className="w-4 h-4 text-blue-400 animate-spin" />}
                            {progress.status === 'complete' && <Check className="w-4 h-4 text-green-400" />}
                            {progress.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                            <span className="text-sm font-medium text-gray-300 capitalize">
                                {progress.status}
                            </span>
                        </div>
                        <button
                            onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            {isProgressExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                            ) : (
                                <ChevronDown className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {isProgressExpanded && progress.channels.length > 0 && (
                        <div className="space-y-2">
                            {progress.channels.map((channel) => (
                                <div
                                    key={channel.channelId}
                                    className="flex items-center justify-between p-2 rounded bg-gray-800/30"
                                >
                                    <span className="text-xs text-gray-300">
                                        {channel.channelName}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {channel.messageCount === undefined ? (
                                            <Loader className="w-3 h-3 animate-spin" />
                                        ) : (
                                            `${channel.messageCount} messages`
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 