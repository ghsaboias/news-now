import { ChannelInfo } from '@/types/discord';
import { Report } from '@/types/report';
import { EventEmitter } from 'events';

interface QueuedChannel {
    channel: ChannelInfo;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
    error?: string;
    report?: Report;
}

export class ChannelQueue extends EventEmitter {
    private channels: QueuedChannel[] = [];
    private processing = new Set<string>();
    private maxConcurrent: number;

    constructor(maxConcurrent = 3) {
        super();
        this.maxConcurrent = maxConcurrent;
    }

    enqueue(channels: ChannelInfo[]) {
        this.channels.push(...channels.map(channel => ({
            channel,
            status: 'pending' as const
        })));
        this.emit('queued', this.getStatus());
        this.processNext();
    }

    private async processNext() {
        // Start as many channels as we can up to maxConcurrent
        while (this.processing.size < this.maxConcurrent) {
            const nextChannel = this.channels.find(c => c.status === 'pending');
            if (!nextChannel) break; // No more pending channels

            nextChannel.status = 'processing';
            this.processing.add(nextChannel.channel.id);
            this.emit('started', nextChannel.channel.id);
        }

        // Only emit updated once after starting all channels
        this.emit('updated', this.getStatus());
    }

    markComplete(channelId: string, report?: Report) {
        const channel = this.channels.find(c => c.channel.id === channelId);
        if (channel) {
            channel.status = 'completed';
            channel.report = report;
            this.processing.delete(channelId);
            this.emit('completed', channelId, report);
            this.emit('updated', this.getStatus());
            this.processNext();
        }
    }

    markError(channelId: string, error: string) {
        const channel = this.channels.find(c => c.channel.id === channelId);
        if (channel) {
            channel.status = 'error';
            channel.error = error;
            this.processing.delete(channelId);
            this.emit('error', channelId, error);
            this.emit('updated', this.getStatus());
            this.processNext();
        }
    }

    updateProgress(channelId: string, progress: number) {
        const channel = this.channels.find(c => c.channel.id === channelId);
        if (channel) {
            channel.progress = progress;
            this.emit('progress', channelId, progress);
            this.emit('updated', this.getStatus());
        }
    }

    getStatus() {
        return {
            total: this.channels.length,
            pending: this.channels.filter(c => c.status === 'pending').length,
            processing: this.channels.filter(c => c.status === 'processing').length,
            completed: this.channels.filter(c => c.status === 'completed').length,
            error: this.channels.filter(c => c.status === 'error').length,
            channels: this.channels
        };
    }

    isComplete() {
        return this.channels.every(c =>
            c.status === 'completed' || c.status === 'error'
        );
    }
} 