import { act, renderHook } from '@testing-library/react';
import { useDisclosure } from '../useDisclosure';

describe('useDisclosure', () => {
    it('initializes with default state (false)', () => {
        const { result } = renderHook(() => useDisclosure());
        expect(result.current.isOpen).toBe(false);
    });

    it('initializes with provided state', () => {
        const { result } = renderHook(() => useDisclosure(true));
        expect(result.current.isOpen).toBe(true);
    });

    it('opens with onOpen', () => {
        const { result } = renderHook(() => useDisclosure(false));
        act(() => {
            result.current.onOpen();
        });
        expect(result.current.isOpen).toBe(true);
    });

    it('closes with onClose', () => {
        const { result } = renderHook(() => useDisclosure(true));
        act(() => {
            result.current.onClose();
        });
        expect(result.current.isOpen).toBe(false);
    });

    it('toggles with onToggle', () => {
        const { result } = renderHook(() => useDisclosure(false));

        // Toggle to true
        act(() => {
            result.current.onToggle();
        });
        expect(result.current.isOpen).toBe(true);

        // Toggle back to false
        act(() => {
            result.current.onToggle();
        });
        expect(result.current.isOpen).toBe(false);
    });

    it('maintains stable function references', () => {
        const { result, rerender } = renderHook(() => useDisclosure());
        const initialFunctions = { ...result.current };

        rerender();

        expect(result.current.onOpen).toBe(initialFunctions.onOpen);
        expect(result.current.onClose).toBe(initialFunctions.onClose);
        expect(result.current.onToggle).toBe(initialFunctions.onToggle);
    });
}); 