'use client';

import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import Link from "next/link";

export default function HomeContent() {
    // Monitor performance on the client side only
    usePerformanceMonitor('HomeContent', {
        logMemory: true,
        logRenderCount: true,
        logMountTime: true
    });

    // Introduction section with enhanced copy and clearer CTAs.
    const introductionSection = (
        <section className="text-center flex flex-col items-center gap-6 w-full px-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tight font-bold text-gray-50">
                Real-time Insights for What Matters
            </h1>
            <p className="max-w-2xl text-sm sm:text-base md:text-lg text-gray-300">
                Access focused news updates with clarity and precision.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 w-full">
                <div className="bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-2xl text-blue-400 font-bold mb-2">
                        Trump's Executive Orders Tracker
                    </h2>
                    <p className="text-sm sm:text-base text-gray-300 mb-4">
                        Keep track of executive orders with real-time updates and insightful analysis.
                    </p>
                    <div className="flex flex-col items-center gap-2">
                        <Link
                            href="https://trump-tracker.aiworld.com.br/"
                            className="group inline-block p-3 text-lg font-medium rounded-md text-gray-50 bg-blue-600 hover:bg-blue-700 transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Trump's Executive Orders Tracker"
                        >
                            Explore Orders
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
                        Stay up-to-date with trending topics and deep-dive analyses on the stories that matter.
                    </p>
                    <div className="flex flex-col items-center gap-2">
                        <Link
                            href="/summarizer"
                            className="group inline-block p-3 text-lg font-medium rounded-md text-gray-50 bg-blue-600 hover:bg-blue-700 transition-colors"
                            title="View NewsNow Topics Tracker"
                        >
                            Explore Topics
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
            <header className="py-4 mx-8">
                <div className="text-xl sm:text-2xl font-medium text-gray-50" role="banner">
                    NewsNow
                </div>
            </header>
            <main className="flex-grow flex flex-col justify-center items-center gap-4">
                {introductionSection}
            </main>
            <footer className="pb-8 w-full">
                <div className="text-center text-gray-400 text-sm">
                    © 2024 NewsNow. All rights reserved.
                </div>
            </footer>
        </div>
    );
} 