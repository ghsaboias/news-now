'use client';
import Link from "next/link";
import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="pt-6">
          <nav className="flex justify-between items-center">
            <div className="text-2xl font-bold text-white">NewsNow</div>
            <div className="flex gap-4">
              <Link 
                href="/discord-test" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Try Demo
              </Link>
              <a 
                href="https://github.com/yourusername/news-now" 
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
              <span className="block">Stay Informed with</span>
              <span className="block text-blue-400">AI-Powered Summaries</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Get instant, intelligent summaries of Discord conversations. Never miss important updates again.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  href="/discord-test"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>

          {/* Feature Section */}
          <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-blue-400 text-xl mb-2">Real-time Summaries</div>
              <p className="text-gray-300">Get instant summaries of your Discord conversations as they happen.</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-blue-400 text-xl mb-2">AI-Powered</div>
              <p className="text-gray-300">Powered by advanced AI to extract the most relevant information.</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-blue-400 text-xl mb-2">Easy Integration</div>
              <p className="text-gray-300">Seamlessly integrates with your Discord servers in just a few clicks.</p>
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
  );
}
