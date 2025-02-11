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
        <section className="text-center flex flex-col items-center gap-2 w-full px-4 max-w-[2000px] mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl tracking-tight font-bold text-gray-50 mb-4 md:mb-6 lg:mb-8">
                Real-time Insights for <br />
                <span className="text-blue-400 relative inline-block after:content-[''] after:absolute after:w-full after:h-1 after:-bottom-2 after:left-0 after:bg-blue-400/20">
                    What Matters
                </span>
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8 mt-4 md:mt-6 lg:mt-8 w-full">
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/50 hover:border-gray-600/50 transition-all p-6 md:p-8 lg:p-10 text-center group hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-0.5 duration-300">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl text-blue-400 font-bold mb-4 md:mb-6">
                        Executive Orders Tracker
                    </h2>
                    <p className="text-base md:text-lg lg:text-xl text-gray-300 mb-8 md:mb-10">
                        Executive orders with real-time updates and summaries.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href="https://trump-tracker.aiworld.com.br/"
                            className="group w-full md:w-auto inline-flex justify-center items-center px-6 py-4 text-lg md:text-xl font-medium rounded-lg text-gray-50 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all gap-2 shadow-lg hover:shadow-blue-500/25"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Trump's Executive Orders Tracker"
                        >
                            Explore EOs
                            <ArrowUpRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                        <Link
                            href="https://github.com/ghsaboias/trump-tracker"
                            className="inline-flex justify-center items-center gap-2 text-base md:text-lg text-gray-400 hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Trump's Tracker on GitHub"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            View on GitHub
                        </Link>
                    </div>
                </div>

                <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/50 hover:border-gray-600/50 transition-all p-6 md:p-8 lg:p-10 text-center group hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-0.5 duration-300">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl text-blue-400 font-bold mb-4 md:mb-6">
                        NewsNow Topics Tracker
                    </h2>
                    <p className="text-base md:text-lg lg:text-xl text-gray-300 mb-8 md:mb-10">
                        Trending topics tracker with real-time updates and summaries.
                    </p>
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href="/summarizer"
                            className="group w-full md:w-auto inline-flex justify-center items-center px-6 py-4 text-lg md:text-xl font-medium rounded-lg text-gray-50 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all gap-2 shadow-lg hover:shadow-blue-500/25"
                            title="View NewsNow Topics Tracker"
                        >
                            Explore Topics
                            <ArrowUpRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                        <Link
                            href="https://github.com/ghsaboias/news-now"
                            className="inline-flex justify-center items-center gap-2 text-base md:text-lg text-gray-400 hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View NewsNow Tracker on GitHub"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            View on GitHub
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );

    return (
        <div className="min-h-screen mx-auto lg:px-12 sm:px-4 bg-gray-900 bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center py-8 md:py-12 lg:py-16">
            <header className="w-full max-w-[2000px] px-4 mb-8 md:mb-12 lg:mb-16">
                <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-50 text-center">
                    News<span className="text-blue-400">Now</span>
                </div>
            </header>
            <main className="flex-grow flex flex-col justify-center items-center w-full">
                {introductionSection}
            </main>
            <footer className="w-full mt-8 md:mt-12 lg:mt-16">
                <div className="text-center text-gray-400 text-sm md:text-base">
                    © 2024 NewsNow. All rights reserved.
                </div>
            </footer>
        </div>
    );
} 