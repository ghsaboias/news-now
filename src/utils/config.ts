interface Config {
  DISCORD_TOKEN: string;
  GUILD_ID: string;
  REQUEST_TIMEOUT: number;
  MAX_BATCH_SIZE: number;
}

// In Next.js, we need to check if we're on the client side
const isClient = typeof window !== 'undefined';

// Only check for required env vars on the server side
if (!isClient) {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }
}

// GUILD_ID can be accessed on both client and server
if (!process.env.NEXT_PUBLIC_GUILD_ID) {
  throw new Error('NEXT_PUBLIC_GUILD_ID environment variable is required');
}

export const config: Config = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  GUILD_ID: process.env.NEXT_PUBLIC_GUILD_ID || '',
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_BATCH_SIZE: 1000, // Maximum number of messages to fetch
}; 