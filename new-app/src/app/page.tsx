'use client';
import { TimeSelect, TimeframeOption } from '@/components/controls/TimeSelect';
import { SplitView } from '@/components/layout/SplitView';
import { RecentReports } from '@/components/reports/RecentReports';
import { ReportView } from '@/components/reports/ReportView';
import { ReportsProvider, useReports } from '@/context/ReportsContext';
import { AISummary, DiscordChannel, DiscordMessage, Report } from '@/types';
import Head from 'next/head';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function MainContent() {
    const router = useRouter();
    const [selectedChannel, setSelectedChannel] = useState<string>('');
    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption['value']>('1h');
    const [messages, setMessages] = useState<DiscordMessage[]>([]);
    const [summary, setSummary] = useState<AISummary | null>(null);
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const { addReport } = useReports();

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const response = await fetch('/api/channels');
            if (!response.ok) throw new Error('Failed to fetch channels');
            const data = await response.json();
            setChannels(data);
        } catch (error) {
            console.error('Error fetching channels:', error);
        }
    };

    const fetchMessages = async () => {
        if (!selectedChannelId || !selectedTimeframe) return;

        try {
            const response = await fetch(`/api/messages?channelId=${selectedChannelId}&timeframe=${selectedTimeframe}`);
            if (!response.ok) throw new Error('Failed to fetch messages');
            const data = await response.json();
            setMessages(data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const generateSummary = async () => {
        if (!messages.length) return;

        setIsGenerating(true);
        try {
            const response = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: selectedChannelId,
                    channelName: selectedChannel,
                    timeframe: selectedTimeframe,
                    messages
                }),
            });
            if (!response.ok) throw new Error('Failed to generate summary');
            const data = await response.json();
            setSummary(data);
        } catch (error) {
            console.error('Error generating summary:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const timeframeOptions: TimeframeOption[] = [
        { value: '1h', label: 'Last Hour' },
        { value: '4h', label: 'Last 4 Hours' },
        { value: '24h', label: 'Last 24 Hours' },
    ];

    const getTimeframeMs = (timeframe: string) => {
        const value = parseInt(timeframe);
        const unit = timeframe.slice(-1);
        const multiplier = unit === 'h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        return value * multiplier;
    };

    const handleSaveReport = async () => {
        if (!summary) return;

        const report: Report = {
            id: crypto.randomUUID(),
            channelId: selectedChannelId,
            channelName: selectedChannel,
            timestamp: new Date().toISOString(),
            timeframe: {
                type: selectedTimeframe,
                start: new Date(Date.now() - getTimeframeMs(selectedTimeframe)).toISOString(),
                end: new Date().toISOString(),
            },
            messageCount: messages.length,
            summary: {
                ...summary,
                timestamp: new Date().toISOString()
            }
        };

        await addReport(report);
        setSummary(null);
        setMessages([]);
    };

    const mainContent = (
        <div className="h-full">
            {summary && (
                <div>
                    <ReportView
                        report={{
                            id: 'draft',
                            channelId: selectedChannelId,
                            channelName: selectedChannel,
                            timestamp: new Date().toISOString(),
                            timeframe: {
                                type: selectedTimeframe,
                                start: new Date(Date.now() - getTimeframeMs(selectedTimeframe)).toISOString(),
                                end: new Date().toISOString(),
                            },
                            messageCount: messages.length,
                            summary: {
                                ...summary,
                                timestamp: new Date().toISOString()
                            }
                        }}
                    />
                    <div className="fixed bottom-8 right-8">
                        <button
                            onClick={handleSaveReport}
                            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-500 transition-colors"
                        >
                            Save Report
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <SplitView
            sidebarContent={
                <div className="flex h-full flex-col gap-6 p-6">
                    {/* Channel Select */}
                    <div>
                        <label htmlFor="channel" className="block text-sm font-medium text-gray-400">
                            Channel
                        </label>
                        <select
                            id="channel"
                            value={selectedChannelId}
                            onChange={(e) => {
                                const channel = channels.find(c => c.id === e.target.value);
                                if (channel) {
                                    setSelectedChannelId(channel.id);
                                    setSelectedChannel(channel.name);
                                }
                            }}
                            className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">Select a channel</option>
                            {channels.map((channel) => (
                                <option key={channel.id} value={channel.id}>
                                    #{channel.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Time Select */}
                    <TimeSelect
                        value={selectedTimeframe}
                        onChange={setSelectedTimeframe}
                        options={timeframeOptions}
                    />

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={fetchMessages}
                            disabled={!selectedChannelId || !selectedTimeframe}
                            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Fetch Messages
                        </button>

                        <button
                            onClick={generateSummary}
                            disabled={!messages.length || isGenerating}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating...' : 'Generate Summary'}
                        </button>
                    </div>

                    {/* Message Count */}
                    {messages.length > 0 && (
                        <div className="text-sm text-gray-400">
                            {messages.length} messages found
                        </div>
                    )}

                    {/* Recent Reports */}
                    <RecentReports />
                </div>
            }
            mainContent={mainContent}
        />
    );
}

export default function Home() {
    return (
        <ReportsProvider>
            <Head>
                <title>NewsNow - Transform Discord Chaos into Clear Updates</title>
                <meta name="description" content="Turn busy Discord channels into clear, actionable updates. Stay on top of your communities without the overwhelm." />
            </Head>
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <header className="pt-6">
                        <nav className="flex justify-between items-center">
                            <div className="text-2xl font-bold text-white">NewsNow</div>
                            <div className="flex gap-4">
                                <Link 
                                    href="/discord-test" 
                                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                                >
                                    <span>Demo</span>
                                </Link>
                                <a 
                                    href="https://github.com/ghsaboias/news-now" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-white transition-colors"
                                >
                                    GitHub
                                </a>
                            </div>
                        </nav>
                    </header>

                    {/* Hero Section */}
                    <main className="mt-16 sm:mt-24">
                        <div className="text-center">
                            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                                <span className="block">Transform Discord Chaos</span>
                                <span className="block text-blue-400">into Clear Updates</span>
                            </h1>
                            <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                                Stay on top of your communities without the overwhelm. Get clear summaries that help you understand and act on what matters.
                            </p>
                            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                                <div className="rounded-md shadow">
                                    <Link
                                        href="/summarizer"
                                        className="group w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-all"
                                    >
                                        <span>Demo</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Demo Preview */}
                            <div className="mt-12 bg-gray-800 p-6 rounded-lg max-w-2xl mx-auto shadow-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-sm text-gray-400">Example Summary</div>
                                    <div className="text-sm text-blue-400">5 min ago</div>
                                </div>
                                <div className="text-left space-y-3">
                                    <p className="text-white">Key Updates from #project-planning:</p>
                                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                                        <li>Team agreed on Q2 roadmap priorities</li>
                                        <li>New feature launch moved to April 15th</li>
                                        <li>@Sarah will lead the API documentation effort</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Feature Section */}
                        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-3">
                            <div className="bg-gray-800 rounded-lg p-6">
                                <div className="text-blue-400 text-xl mb-2">Make Better Decisions</div>
                                <p className="text-gray-300">Get the context you need without reading every message. Stay informed and decisive.</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-6">
                                <div className="text-blue-400 text-xl mb-2">Save Hours Daily</div>
                                <p className="text-gray-300">Stop scrolling through endless messages. Get straight to what your team needs to know.</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-6">
                                <div className="text-blue-400 text-xl mb-2">Minimal Setup</div>
                                <p className="text-gray-300">One-click Discord authorization. We respect your privacy and only access what you allow.</p>
                            </div>
                        </div>
                    </main>

                    {/* Footer */}
                    <footer className="mt-24 pb-8">
                        <div className="text-center text-gray-400 text-sm">
                            © 2024 NewsNow. All rights reserved.
                        </div>
                    </footer>
                </div>
            </div>
            <MainContent />
        </ReportsProvider>
    );
}
