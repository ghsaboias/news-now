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
        <div className="text-center flex flex-col items-center gap-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-medium text-gray-50 leading-tight">
                <span className="block">Real-time updates</span>
                <span className="block text-blue-400">about what matters</span>
            </h1>
            <p className="max-w-md mx-auto text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed md:max-w-3xl">
                Stay on top of current events without the overwhelm.
            </p>
            <div className="max-w-md">
                <div className="rounded-md shadow">
                    <Link
                        href="/summarizer"
                        className="group w-full flex items-center justify-center p-3 md:p-4 text-base md:text-lg font-medium rounded-md text-gray-50 bg-blue-600 hover:bg-blue-700 transition-colors duration-DEFAULT focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 mb-4"
                    >
                        <span>Demo</span>
                    </Link>
                </div>
            </div>
        </div>
    );

    const features = (
        <section className="my-8 w-[90%] mx-auto flex flex-col items-center">
            <Grid columns={{ sm: 1, md: 3 }} spacing="relaxed">
                < div className="bg-gray-800 rounded-lg p-4 lg:p-6" >
                    <Stack spacing="default" className="items-center">
                        <h3 className="text-base sm:text-lg font-medium text-blue-400 leading-snug">Real-Time Intelligence</h3>
                        <p className="text-sm sm:text-base text-gray-300 leading-normal text-center">Transform live discussions into clear, actionable insights</p>
                    </Stack>
                </div >
                <div className="bg-gray-800 rounded-lg p-4 lg:p-6">
                    <Stack spacing="default" className="items-center">
                        <h3 className="text-base sm:text-lg font-medium text-blue-400 leading-snug">Seamless Integration</h3>
                        <p className="text-sm sm:text-base text-gray-300 leading-normal text-center">AI-powered summaries with enterprise-grade security</p>
                    </Stack>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 lg:p-6">
                    <Stack spacing="default" className="items-center">
                        <h3 className="text-base sm:text-lg font-medium text-blue-400 leading-snug">Periodic Updates</h3>
                        <p className="text-sm sm:text-base text-gray-300 leading-normal text-center">
                            Get live updates on your favorite topics
                        </p>
                    </Stack>
                </div>
            </Grid >
        </section >
    );

    return (
        <div className="lg:w-[90%] sm:w-[100%] h-screen mx-auto bg-gray-900 flex flex-col">
            <header className="py-4 flex justify-between items-center mx-8">
                <div className="text-xl sm:text-2xl font-medium text-gray-50" role="banner">NewsNow</div>
                <nav className="flex justify-between items-center">
                    <Stack direction="horizontal" spacing="default">
                        <Link
                            href="https://github.com/ghsaboias/news-now"
                            className="px-4 py-2 text-sm font-medium rounded-md text-gray-50 bg-blue-600 hover:bg-blue-700 transition-colors duration-DEFAULT"
                            target="_blank"
                        >
                            <span>About</span>
                        </Link>
                    </Stack>
                </nav>
            </header>
            <div className="flex-grow flex flex-col justify-center items-center gap-4">



                {hero}
                {features}


            </div>
            <footer className="pb-8 w-full">
                <div className="text-center text-gray-400 text-sm">
                    © 2024 NewsNow. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

export default function Home() {
    return <HomeContent />;
}
