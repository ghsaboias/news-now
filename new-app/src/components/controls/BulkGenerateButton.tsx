import { useReports } from '@/context/ReportsContext';
import { ActivityThreshold, ChannelActivity } from '@/types';
import { useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronUp, Loader, X } from 'react-feather';

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
                        setProgress(prev => ({
                            ...prev,
                            currentChannel: undefined,
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
                            currentChannel: undefined,
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

    // Calculate summary counts
    const successCount = progress.channels.filter(c => c.status === 'success').length;
    const skippedCount = progress.channels.filter(c => c.status === 'skipped').length;
    const errorCount = progress.channels.filter(c => c.status === 'error').length;

    return (
        <div className="space-y-4 bg-gray-900/50 rounded-xl p-4">
            {/* Configuration Section */}
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Select Timeframe</h3>
                <div className="grid grid-cols-3 gap-2 bg-gray-800/30 p-1.5 rounded-lg">
                    {TIMEFRAME_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSelectedTimeframe(option.value as '1h' | '4h' | '24h')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-all
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
                <div className="text-xs text-gray-500">
                    Minimum messages: {DEFAULT_THRESHOLDS.find(t => t.timeframe === selectedTimeframe)?.minMessages}
                </div>
            </div>

            {/* Action Section */}
            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 
                    disabled:bg-blue-800 text-white rounded-lg px-4 py-3 font-medium transition-all
                    shadow-lg hover:shadow-xl disabled:shadow-none"
            >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                Generate Reports for Active Channels
            </button>

            {/* Progress Section */}
            {progress.status !== 'idle' && (
                <button
                    onClick={() => setIsProgressExpanded(!isProgressExpanded)}
                    className="space-y-3 bg-gray-800/30 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
                >
                    {/* Header with Status and Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium text-gray-300">
                                {progress.status === 'scanning' && (
                                    <div className="flex items-center gap-2">
                                        <Loader className="w-4 h-4 animate-spin text-blue-400" />
                                        <span>Scanning channels...</span>
                                    </div>
                                )}
                                {progress.status === 'generating' && (
                                    <div className="flex items-center gap-2">
                                        <Loader className="w-4 h-4 animate-spin text-blue-400" />
                                        <span>Generating reports...</span>
                                    </div>
                                )}
                                {progress.status === 'complete' && (
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                        <span>Generation complete</span>
                                    </div>
                                )}
                                {progress.status === 'error' && (
                                    <div className="flex items-center gap-2">
                                        <X className="w-4 h-4 text-red-400" />
                                        <span>Error generating reports</span>
                                    </div>
                                )}
                            </div>
                            {progress.channels.length > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    {successCount > 0 && (
                                        <span className="text-green-400">{successCount} generated</span>
                                    )}
                                    {skippedCount > 0 && (
                                        <span className="text-yellow-400">{skippedCount} skipped</span>
                                    )}
                                    {errorCount > 0 && (
                                        <span className="text-red-400">{errorCount} failed</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div
                            className="p-1.5 rounded-md transition-colors"
                        >
                            {isProgressExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                resetProgress();
                            }}
                            className="ml-2 p-1.5 rounded-md hover:bg-gray-700/50 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    {/* Channel List */}
                    {isProgressExpanded && (
                        <div className="space-y-2">
                            {progress.currentChannel && (
                                <div className="text-xs text-blue-400 flex items-center gap-2">
                                    <Loader className="w-3 h-3 animate-spin" />
                                    Processing: #{progress.currentChannel}
                                </div>
                            )}

                            <div className="space-y-1">
                                {progress.channels.map(channel => (
                                    <div
                                        key={channel.channelId}
                                        className="flex items-center justify-between py-1.5 px-2 rounded-md
                                            bg-gray-800/30 hover:bg-gray-800/50 transition-colors min-w-0"
                                    >
                                        <span className="text-xs text-gray-300 truncate mr-3">#{channel.channelName}</span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className={`text-xs flex items-center gap-1.5 ${
                                                channel.status === 'success' ? 'text-green-400' :
                                                channel.status === 'error' ? 'text-red-400' :
                                                channel.status === 'processing' ? 'text-blue-400' :
                                                channel.status === 'skipped' ? 'text-yellow-400' :
                                                'text-gray-400'
                                            }`}>
                                                {channel.status === 'success' && <Check className="w-3 h-3" />}
                                                {channel.status === 'error' && <X className="w-3 h-3" />}
                                                {channel.status === 'processing' && <Loader className="w-3 h-3 animate-spin" />}
                                                {channel.status === 'skipped' && <AlertCircle className="w-3 h-3" />}
                                                {channel.status === 'success' && `${channel.messageCount} messages`}
                                                {channel.status === 'error' && 'Error'}
                                                {channel.status === 'processing' && 'Processing...'}
                                                {channel.status === 'skipped' && `${channel.messageCount} messages`}
                                                {channel.status === 'pending' && 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </button>
            )}
        </div>
    );
} 