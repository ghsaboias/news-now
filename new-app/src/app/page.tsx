'use client';
import Head from 'next/head';
import Link from "next/link";
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();
  return (
    <>
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
                  className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span>See it in Action</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
                    href="https://app.aiworld.com.br"
                    className="group w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10 transition-all"
                  >
                    <span>Add to Discord</span>
                    <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
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
    </>
  );
}
