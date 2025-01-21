'use client';
import { ReportsProvider } from '@/context/ReportsContext';
import Head from 'next/head';
import Link from "next/link";

export default function Home() {
    return (
        <ReportsProvider>
            <Head>
                <title>NewsNow - Real-time updates about what matters</title>
                <meta name="description" content="Stay on top of current events without the overwhelm." />
            </Head>
            <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <header className="pt-6">
                        <nav className="flex justify-between items-center">
                            <div className="text-2xl font-bold text-white">NewsNow</div>
                            <div className="flex gap-4">
                                <Link 
                                    href="/summarizer" 
                                    className="text-gray-300 hover:text-white transition-colors flex items-center"
                                >
                                    <span>Demo</span>
                                </Link>
                            </div>
                        </nav>
                    </header>

                    {/* Hero Section */}
                    <main className="mt-16 sm:mt-24">
                        <div className="text-center">
                            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                                <span className="block">Real-time updates</span>
                                <span className="block text-blue-400">about what matters</span>
                            </h1>
                            <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                                Stay on top of current events without the overwhelm.
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
                        </div>

                        {/* Feature Section */}
                        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2">
                            <div className="bg-gray-800 rounded-lg p-6">
                                <div className="text-blue-400 text-xl mb-2 text-center">Real-Time Intelligence</div>
                                <p className="text-gray-300 text-center">Transform live discussions into clear, actionable insights</p>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-6">
                                <div className="text-blue-400 text-xl mb-2 text-center">Seamless Integration</div>
                                <p className="text-gray-300 text-center">AI-powered summaries with enterprise-grade security</p>
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
        </ReportsProvider>
    );
}
