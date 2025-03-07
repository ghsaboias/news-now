import { DiscordClient } from '@/services/discord/client';
import { DiscordChannel } from '@/types';
import { useEffect, useState } from 'react';

export function useDiscordChannels() {
    const [channels, setChannels] = useState<DiscordChannel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchChannels() {
            try {
                const client = new DiscordClient();
                const fetchedChannels = await client.fetchChannels();
                setChannels(fetchedChannels);
                setError(null);
            } catch (err) {
                setError('Failed to fetch Discord channels');
                console.error('Error fetching channels:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchChannels();
    }, []);

    return { channels, isLoading, error };
} 