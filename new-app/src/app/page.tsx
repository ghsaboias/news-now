'use client';
import { Grid } from '@/components/layout/Grid';
import { Stack } from '@/components/layout/Stack';
import { ReportsProvider } from '@/context/ReportsContext';
import Head from 'next/head';
import Link from "next/link";
import { useEffect, useMemo, useRef } from 'react';

// Performance logging helper
const perf = {
    start: (label: string) => {
        console.time(`⏱️ ${label}`);
        performance.mark(`${label}-start`);
        
        if (performance.memory) {
            console.log(`📊 Memory at ${label}:`, {
                usedHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
                totalHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
            });
        }
    },
    
    end: (label: string) => {
        console.timeEnd(`⏱️ ${label}`);
        performance.mark(`${label}-end`);
        performance.measure(label, `${label}-start`, `${label}-end`);
    }
};

// Component render counter
function useRenderCount(componentName: string) {
    const renderCount = useRef(0);
    
    useEffect(() => {
        renderCount.current += 1;
        console.log(`🔄 ${componentName} render #${renderCount.current}`);
    });
    
    return renderCount.current;
}

function HomeContent() {
    const renderCount = useRenderCount('HomeContent');
    
    useEffect(() => {
        perf.start('homeMount');
        return () => perf.end('homeMount');
    }, []);

    // Memoize static content sections
    const hero = useMemo(() => (
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
                                className="
                                    group w-full flex items-center justify-center 
                                    p-3 md:p-4
                                    text-base md:text-lg font-medium 
                                    rounded-md 
                                    text-gray-50 bg-blue-600 hover:bg-blue-700 
                                    transition-colors duration-DEFAULT
                                    focus-visible:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-blue-500
                                    focus-visible:ring-offset-2
                                    focus-visible:ring-offset-gray-900
                                    mb-4
                                "
                            >
                                <span>Demo</span>
                            </Link>
                        </div>
                    </div>
                </Stack>
            </div>
        </Stack>
    ), []);

    const features = useMemo(() => (
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
    ), []);

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <header className="py-4">
                    <nav className="flex justify-between items-center">
                        <div className="text-xl sm:text-2xl font-medium text-gray-50" role="banner">NewsNow</div>
                        <Stack direction="horizontal" spacing="default">
                            <Link 
                                href="/summarizer" 
                                className="
                                    px-4 py-2 
                                    text-sm font-medium 
                                    rounded-md 
                                    text-gray-50 bg-blue-600 hover:bg-blue-700 
                                    transition-colors duration-DEFAULT
                                "
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

export default function Home() {
    return (
        <ReportsProvider>
            <Head>
                <title>NewsNow - Real-time Discord Summaries</title>
                <meta name="description" content="Stay on top of Discord discussions with AI-powered summaries" />
            </Head>
            <HomeContent />
        </ReportsProvider>
    );
}
