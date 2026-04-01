import { useEffect, useState, RefObject } from 'react';

/**
 * Returns 'top' when there isn't enough space below the trigger element
 * to show a dropdown, so it should open upward instead.
 */
export function useDropdownPlacement(
    triggerRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    menuHeight = 220,
): 'top' | 'bottom' {
    const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');

    useEffect(() => {
        if (!isOpen || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setPlacement(spaceBelow < menuHeight ? 'top' : 'bottom');
    }, [isOpen, triggerRef, menuHeight]);

    return placement;
}
