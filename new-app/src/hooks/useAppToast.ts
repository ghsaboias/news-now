'use client';

import { useToast } from '@/hooks/useToast';

export function useAppToast() {
    const { toast } = useToast();

    return {
        success: (message: string) => {
            toast({
                title: 'Success',
                description: message,
                variant: 'default',
            });
        },
        error: (message: string) => {
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            });
        },
        info: (message: string) => {
            toast({
                title: 'Info',
                description: message,
            });
        },
        custom: (title: string, message: string, variant?: 'default' | 'destructive') => {
            toast({
                title,
                description: message,
                variant,
            });
        },
    };
} 