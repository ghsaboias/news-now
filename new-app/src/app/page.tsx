import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

// Client Components
const HomeContent = dynamic(
    () => import('@/components/home/HomeContent'),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        ),
    }
);

// Metadata configuration at the page level
export const metadata: Metadata = {
    title: 'Home | News Now',
    description: 'Access focused news updates with clarity and precision.',
    openGraph: {
        title: 'News Now - Real-time Insights',
        description: 'Access focused news updates with clarity and precision.',
        url: 'https://app.aiworld.com.br',
        siteName: 'News Now',
        locale: 'en_US',
        type: 'website',
    },
};

export default function HomePage() {
    return <HomeContent />;
}