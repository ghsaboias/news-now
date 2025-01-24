'use client';

import { Grid } from '@/components/layout/Grid';
import { Stack } from '@/components/layout/Stack';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import Link from "next/link";

function HomeContent() {
    // Monitor performance on the client side only
    usePerformanceMonitor('HomeContent', {
        logMemory: true,
        logRenderCount: true,
        logMountTime: true
    });

    const hero = (
        <Stack spacing="relaxed" className="mt-16 sm:mt-24">
            <div className="text-center">
                <Stack spacing="default">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-medium text-gray-50 leading-tight">
                        <span className="block">Real-time updates</span>
                        <span className="block text-blue-400">about what matters</span>
                    </h1>
                    <p className="max-w-md mx-auto text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed md:max-w-3xl">
                        Stay on top of current events without the overwhelm.
                    </p>
                    <div className="max-w-md mx-auto sm:flex sm:justify-center">
                        <div className="rounded-md shadow">
                            <Link
                                href="/summarizer"
                                className="group w-full flex items-center justify-center p-3 md:p-4 text-base md:text-lg font-medium rounded-md text-gray-50 bg-blue-600 hover:bg-blue-700 transition-colors duration-DEFAULT focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 mb-4"
                            >
                                <span>Demo</span>
                            </Link>
                        </div>
                    </div>
                </Stack>
            </div>
        </Stack>
    );

    const features = (
        <section>
            <h2 className="sr-only">Features</h2>
            <Grid columns={{ sm: 1, md: 2 }} spacing="default">
                <div className="bg-gray-800 rounded-lg p-4 lg:p-6">
                    <Stack spacing="default" className="items-center">
                        <h3 className="text-base sm:text-lg font-medium text-blue-400 leading-snug">Real-Time Intelligence</h3>
                        <p className="text-sm sm:text-base text-gray-300 leading-normal">Transform live discussions into clear, actionable insights</p>
                    </Stack>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 lg:p-6">
                    <Stack spacing="default" className="items-center">
                        <h3 className="text-base sm:text-lg font-medium text-blue-400 leading-snug">Seamless Integration</h3>
                        <p className="text-sm sm:text-base text-gray-300 leading-normal">AI-powered summaries with enterprise-grade security</p>
                    </Stack>
                </div>
            </Grid>
        </section>
    );

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="py-4">
                    <nav className="flex justify-between items-center">
                        <div className="text-xl sm:text-2xl font-medium text-gray-50" role="banner">NewsNow</div>
                        <Stack direction="horizontal" spacing="default">
                            <Link 
                                href="/summarizer" 
                                className="px-4 py-2 text-sm font-medium rounded-md text-gray-50 bg-blue-600 hover:bg-blue-700 transition-colors duration-DEFAULT"
                            >
                                <span>Demo</span>
                            </Link>
                        </Stack>
                    </nav>
                </header>

                {hero}
                {features}

                <footer className="mt-24 pb-8">
                    <div className="text-center text-gray-400 text-sm">
                        © 2024 NewsNow. All rights reserved.
                    </div>
                </footer>
            </div>
        </div>
    );
}

// Log server-side render time
console.log('[HomePage] Server render started');
const startTime = performance.now();

export default function Home() {
    console.log(`[HomePage] Server render completed in ${performance.now() - startTime}ms`);
    return <HomeContent />;
}
