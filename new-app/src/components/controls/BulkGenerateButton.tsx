import { useReports } from '@/context/ReportsContext';
import { ActivityThreshold, ChannelActivity } from '@/types';
import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader } from 'react-feather';

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
    const [isProgressExpanded, setIsProgressExpanded] = useState(true);
    const hasSelectedFirstReportRef = useRef(false);
    const [progress, setProgress] = useState<{
        status: 'idle' | 'scanning' | 'generating' | 'complete' | 'error';
        currentChannel?: string;
        channels: ChannelActivity[];
    }>({
        status: 'idle',
        channels: [],
    });

    const handleGenerate = async () => {
        setLoading(true);
        setProgress({ status: 'scanning', channels: [] });
        hasSelectedFirstReportRef.current = false;

        try {
            const eventSource = new EventSource(`/api/reports/bulk-generate?timeframe=${selectedTimeframe}`);

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'scanning':
                    case 'progress':
                        setProgress(prev => ({
                            ...prev,
                            status: data.type,
                            currentChannel: data.channel,
                            channels: data.channels,
                        }));
                        break;
                    
                    case 'report':
                        if (!hasSelectedFirstReportRef.current) {
                            setCurrentReport(data.report);
                            hasSelectedFirstReportRef.current = true;
                        }
                        onComplete?.();
                        break;
                    
                    case 'complete':
                        setProgress(prev => ({
                            ...prev,
                            status: 'complete',
                            channels: data.channels,
                        }));
                        eventSource.close();
                        onComplete?.(); // Final update
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
            {/* Timeframe Selection */}
            <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                {TIMEFRAME_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setSelectedTimeframe(option.value as '1h' | '4h' | '24h')}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all
                            ${selectedTimeframe === option.value
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-transparent text-gray-400 hover:bg-gray-700/50'
                            }`}
                        disabled={loading}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 
                    disabled:bg-blue-800 text-white rounded-lg px-4 py-2.5 font-medium transition-all
                    shadow-lg hover:shadow-xl disabled:shadow-none"
            >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                Generate Reports for Active Channels
            </button>

            {/* Progress Section */}
            {progress.status !== 'idle' && (
                <div className="space-y-2 bg-gray-800/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-400">
                            {progress.status === 'scanning' && 'Scanning channels...'}
                            {progress.status === 'generating' && 'Generating reports...'}
                            {progress.status === 'complete' && 'Generation complete'}
                            {progress.status === 'error' && 'Error generating reports'}
                        </div>
                        <button
                            onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                            className="p-1 hover:bg-gray-700/50 rounded-md transition-colors"
                        >
                            {isProgressExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                    </div>

                    {isProgressExpanded && (
                        <>
                            {progress.currentChannel && (
                                <div className="text-xs text-gray-500">
                                    Processing: {progress.currentChannel}
                                </div>
                            )}

                            <div className="space-y-1">
                                {progress.channels.map(channel => (
                                    <div
                                        key={channel.channelId}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span className="text-gray-300">#{channel.channelName}</span>
                                        <span className={`text-xs ${
                                            channel.status === 'success' ? 'text-green-400' :
                                            channel.status === 'error' ? 'text-red-400' :
                                            channel.status === 'processing' ? 'text-blue-400' :
                                            channel.status === 'skipped' ? 'text-yellow-400' :
                                            'text-gray-400'
                                        }`}>
                                            {channel.status === 'success' ? `${channel.messageCount} messages` :
                                             channel.status === 'error' ? 'Error' :
                                             channel.status === 'processing' ? 'Processing...' :
                                             channel.status === 'skipped' ? `${channel.messageCount} messages` :
                                             'Pending'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
} 