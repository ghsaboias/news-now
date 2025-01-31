import { Button } from '@/components/ui/button';
import { useState } from 'react';

type CacheType = 'all' | 'reports' | 'channel-status' | 'generation';

export function CacheControl({
    channelId,
    timeframe
}: {
    channelId?: string;
    timeframe?: string;
}) {
    const [isClearing, setIsClearing] = useState(false);

    const clearCache = async (type: CacheType) => {
        setIsClearing(true);
        try {
            const params = new URLSearchParams({ type });
            if (channelId) params.append('channelId', channelId);
            if (timeframe) params.append('timeframe', timeframe);

            const response = await fetch(`/api/cache?${params.toString()}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to clear cache');
            }

            // Optionally refresh the page or update UI state
            window.location.reload();
        } catch (error) {
            console.error('Error clearing cache:', error);
            alert('Failed to clear cache. Please try again.');
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Cache Controls</h3>
            <div className="flex flex-col gap-2">
                {channelId && timeframe && (
                    <Button
                        onClick={() => clearCache('reports')}
                        disabled={isClearing}
                        variant="secondary"
                        size="sm"
                    >
                        Clear Report Cache
                    </Button>
                )}
                {channelId && (
                    <>
                        <Button
                            onClick={() => clearCache('channel-status')}
                            disabled={isClearing}
                            variant="secondary"
                            size="sm"
                        >
                            Clear Channel Status
                        </Button>
                        <Button
                            onClick={() => clearCache('generation')}
                            disabled={isClearing}
                            variant="secondary"
                            size="sm"
                        >
                            Clear Generation Status
                        </Button>
                    </>
                )}
                <Button
                    onClick={() => clearCache('all')}
                    disabled={isClearing}
                    variant="destructive"
                    size="sm"
                >
                    Clear All Caches
                </Button>
            </div>
        </div>
    );
} 
