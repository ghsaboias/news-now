import { DiscordMessage, OptimizedMessage } from '@/types/discord';

export function optimizeMessage(msg: DiscordMessage): OptimizedMessage {
    return {
        id: msg.id,
        content: msg.content,
        timestamp: msg.timestamp,
        author: {
            username: msg.author?.username || '',
            discriminator: msg.author?.discriminator || ''
        },
        embeds: [{
            title: msg.embeds?.[0]?.title || '',
            description: msg.embeds?.[0]?.description || ''
        }],
    };
}