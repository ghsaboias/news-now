'use client';

import { Button } from '@/components/common/Button';
import { EmptyStateMessage } from '@/components/common/EmptyStateMessage';
import { ChannelSelect } from '@/components/controls/ChannelSelect';
import { ControlsContainer } from '@/components/controls/ControlsContainer';
import { TimeSelect, TimeframeOption, TimeframeValue } from '@/components/controls/TimeSelect';
import { useReports } from '@/context/ReportsContext';
import { useToast } from '@/context/ToastContext';
import { useDiscordChannels } from '@/hooks/useDiscordChannels';
import { useState } from 'react';
import { Loader } from 'react-feather';

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
    { value: '1h', label: 'Last Hour' },
    { value: '4h', label: 'Last 4 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
];

export default function SummarizerPage() {
    const { currentReport, setCurrentReport } = useReports();
    const { channels, isLoading, error } = useDiscordChannels();
    const { showToast } = useToast();
    const [selectedChannel, setSelectedChannel] = useState<string>('');
    const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeValue>('1h');
    const [isGenerating, setIsGenerating] = useState(false);
    const [noMessagesFound, setNoMessagesFound] = useState(false);

    const selectedChannelObj = channels.find(ch => ch.id === selectedChannel);

    const handleGenerateSummary = async () => {
        if (!selectedChannel || !selectedChannelObj) {
            showToast({ text: 'Please select a channel', type: 'error' });
            return;
        }

        setIsGenerating(true);
        setNoMessagesFound(false);

        try {
            // Step 1: Fetch messages
            const messagesResponse = await fetch(
                `/api/messages?channelId=${selectedChannel}&channelName=${encodeURIComponent(selectedChannelObj.name)}&timeframe=${selectedTimeframe}`
            );
            if (!messagesResponse.ok) {
                throw new Error('Failed to fetch messages');
            }
            const messages = await messagesResponse.json();

            // Check if messages array is empty
            if (!messages || messages.length === 0) {
                console.log(`No messages found for channel ${selectedChannelObj.name} in the last ${selectedTimeframe}`);
                setNoMessagesFound(true);
                setIsGenerating(false);
                return;
            }

            // Step 2: Generate summary
            const summaryResponse = await fetch(
                `/api/summary?channelId=${selectedChannel}&channelName=${encodeURIComponent(selectedChannelObj.name)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages, timeframe: selectedTimeframe }),
                }
            );
            if (!summaryResponse.ok) {
                throw new Error('Failed to generate summary');
            }
            const summary = await summaryResponse.json();

            // Step 3: Create report and update context
            const report = {
                id: `${selectedChannel}-${Date.now()}`,
                channelId: selectedChannel,
                channelName: selectedChannelObj.name,
                timestamp: new Date().toISOString(),
                timeframe: {
                    type: selectedTimeframe,
                    start: new Date(Date.now() - (selectedTimeframe === '24h' ? 24 : selectedTimeframe === '4h' ? 4 : 1) * 60 * 60 * 1000).toISOString(),
                    end: new Date().toISOString(),
                },
                messageCount: messages.length,
                summary,
            };
            setCurrentReport(report);
            showToast({ text: 'Summary generated successfully', type: 'success' });
        } catch (err) {
            if (err instanceof Error) {
                showToast({ text: `Error: ${err.message}`, type: 'error' });
            } else {
                showToast({ text: 'An unknown error occurred', type: 'error' });
            }
            console.error('Summary generation failed:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6">
            <ControlsContainer>
                <ChannelSelect
                    channels={channels}
                    selectedChannelId={selectedChannel}
                    onSelect={setSelectedChannel}
                    disabled={isLoading || isGenerating}
                />
                <TimeSelect
                    options={TIMEFRAME_OPTIONS}
                    value={selectedTimeframe}
                    onChange={setSelectedTimeframe}
                    disabled={isLoading || isGenerating || !selectedChannel}
                />
                <Button
                    variant="primary"
                    disabled={isLoading || isGenerating || !selectedChannel}
                    icon={isGenerating ? <Loader className="animate-spin" /> : undefined}
                    onClick={handleGenerateSummary}
                >
                    Generate Summary
                </Button>
            </ControlsContainer>
            <div className="mt-6">
                {error ? (
                    <div className="text-red-500">{error}</div>
                ) : noMessagesFound ? (
                    <EmptyStateMessage
                        channelName={selectedChannelObj?.name || 'selected channel'}
                        timeframe={selectedTimeframe}
                    />
                ) : currentReport ? (
                    <div className="bg-gray-800 p-4 rounded-lg">
                        <h2 className="text-xl font-bold text-gray-50">{currentReport.summary.headline}</h2>
                        <p className="text-gray-300 mt-2">{currentReport.summary.location}</p>
                        <p className="text-gray-200 mt-2">{currentReport.summary.body}</p>
                    </div>
                ) : (
                    <p className="text-gray-400">No report generated yet. Select a channel and timeframe to generate a summary.</p>
                )}
            </div>
        </div>
    );
}