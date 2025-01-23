import { useCallback, useState } from 'react';

interface UseDisclosureReturn {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onToggle: () => void;
}

/**
 * Hook for managing disclosure state (expand/collapse, show/hide, etc.)
 * 
 * @example
 * ```tsx
 * function ExpandableSection() {
 *   const { isOpen, onToggle } = useDisclosure(false);
 *   return (
 *     <div>
 *       <button onClick={onToggle}>
 *         {isOpen ? 'Hide' : 'Show'}
 *       </button>
 *       {isOpen && <div>Content</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDisclosure(initial = false): UseDisclosureReturn {
    const [isOpen, setIsOpen] = useState(initial);

    const onOpen = useCallback(() => setIsOpen(true), []);
    const onClose = useCallback(() => setIsOpen(false), []);
    const onToggle = useCallback(() => setIsOpen(prev => !prev), []);

    return {
        isOpen,
        onOpen,
        onClose,
        onToggle
    };
} 