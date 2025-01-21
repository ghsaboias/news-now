import { Timeframe } from '@/types';

const timeframeBadgeColors: Record<Timeframe['type'], string> = {
    '1h': 'bg-emerald-500/20 text-emerald-400',
    '4h': 'bg-blue-500/20 text-blue-400',
    '24h': 'bg-purple-500/20 text-purple-400',
};

const timeframeLabels: Record<Timeframe['type'], string> = {
    '1h': '1 hour',
    '4h': '4 hours',
    '24h': '24 hours',
};

interface TimeframeBadgeProps {
    timeframe: Timeframe['type'];
    className?: string;
}

export function TimeframeBadge({ timeframe, className = '' }: TimeframeBadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center rounded px-2 py-1 text-xs font-medium
                ${timeframeBadgeColors[timeframe]}
                ${className}
            `}
            title={`Last ${timeframeLabels[timeframe]}`}
        >
            {timeframe}
        </span>
    );
} 