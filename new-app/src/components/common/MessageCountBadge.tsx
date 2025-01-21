interface MessageCountBadgeProps {
    count: number;
    className?: string;
}

export function MessageCountBadge({ count, className = '' }: MessageCountBadgeProps) {
    return (
        <span
            className={`
                inline-flex items-center rounded px-2 py-1 text-xs font-medium
                bg-amber-500/20 text-amber-400
                ${className}
            `}
            title={`${count} messages processed`}
        >
            {count} msgs
        </span>
    );
} 