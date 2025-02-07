'use client';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { ArrowUpRightIcon } from 'lucide-react';
import Link from "next/link";

export default function HomeContent() {
    // Monitor performance on the client side only
    usePerformanceMonitor('HomeContent', {
        logMemory: true,
        logRenderCount: true,
        logMountTime: true
    });

    const isMobile = useMediaQuery('(max-width: 768px)');
    console.log(isMobile);

    // Introduction section with enhanced copy and clearer CTAs.
    const introductionSection = (
        <section className="text-center flex flex-col items-center gap-2 w-full px-4">
            <h1 className="text-3xl sm:text-5xl md:text-6xl tracking-tight font-bold text-gray-50">
                Real-time Insights for <br /> <span className="text-blue-400">What Matters</span>
            </h1>
            <p className="max-w-2xl text-sm sm:text-base md:text-lg text-gray-300">
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 w-full">
                <div className="bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-2xl text-blue-400 font-bold mb-2">
                        Trump's Executive Orders Tracker
                    </h2>
                    <p className="text-sm sm:text-base text-gray-300 mb-4">
                        Executive orders with real-time updates and summaries.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href="https://trump-tracker.aiworld.com.br/"
                            className="group inline-block p-3 text-lg font-medium rounded-md text-gray-50 bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Trump's Executive Orders Tracker"
                        >
                            Explore Executive Orders <ArrowUpRightIcon className="w-4 h-4" />
                        </Link>
                        <Link
                            href="https://github.com/ghsaboias/trump-tracker"
                            className="text-sm text-blue-300 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Trump's Tracker on GitHub"
                        >
                            View on GitHub
                        </Link>
                    </div>
                </div>
                <div className="bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-2xl text-blue-400 font-bold mb-2">
                        NewsNow Topics Tracker
                    </h2>
                    <p className="text-sm sm:text-base text-gray-300 mb-4">
                        Trending topics tracker with real-time updates and summaries.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href="/summarizer"
                            className="group inline-block p-3 text-lg font-medium rounded-md text-gray-50 bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
                            title="View NewsNow Topics Tracker"
                        >
                            Explore Topics <ArrowUpRightIcon className="w-4 h-4" />
                        </Link>
                        <Link
                            href="https://github.com/ghsaboias/news-now"
                            className="text-sm text-blue-300 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View NewsNow Tracker on GitHub"
                        >
                            View on GitHub
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );

    return (
        <div className="lg:w-[90%] sm:w-[100%] min-h-screen mx-auto bg-gray-900 flex flex-col">
            <header className="py-6 mx-8">
                <div className="text-2xl sm:text-2xl font-bold text-gray-50 text-center">
                    News<span className="text-blue-400">Now</span>
                </div>
            </header>
            <main className="flex-grow flex flex-col justify-center items-center gap-4">
                {introductionSection}
            </main>
            <footer className="mt-8 mb-8 w-full">
                <div className="text-center text-gray-400 text-sm">
                    © 2024 NewsNow. All rights reserved.
                </div>
            </footer>
        </div>
    );
} 