
import { useState, useEffect, useCallback, useRef } from "react";

export type PopoverType = "select" | "date" | "none";

interface UsePopoverOptions {
  onClose?: () => void;
}

export function usePopover({ onClose }: UsePopoverOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [popoverType, setPopoverType] = useState<PopoverType>("none");
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Close the popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        closePopover();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (isOpen && event.key === "Escape") {
        closePopover();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen]);

  // Enhanced position calculation for precise alignment with cell
  const calculatePosition = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Estimate popover dimensions based on type
    const popoverHeight = popoverType === 'date' ? 380 : 250; // Calendar is taller than dropdown
    const popoverWidth = popoverType === 'date' ? 300 : 240;
    
    // Space needed for the popover
    const spaceNeeded = popoverHeight;
    
    // Check if there's enough space below the element
    const spaceBelow = viewportHeight - rect.bottom;
    const placeBelow = spaceBelow >= spaceNeeded;
    
    // Calculate vertical position - always align with top or bottom edge precisely
    let top;
    if (placeBelow) {
      // Position exactly at bottom of element
      top = rect.bottom;
    } else {
      // Position exactly at top of element minus popover height
      top = rect.top - popoverHeight;
      
      // If positioning above would go off-screen, adjust to visible area
      if (top < 0) {
        top = 0;
      }
    }
    
    // Calculate horizontal position - align with left edge of element
    let left = rect.left;
    
    // Prevent horizontal overflow
    if (left + popoverWidth > viewportWidth) {
      left = viewportWidth - popoverWidth;
      if (left < 0) left = 0; // Ensure it's not negative
    }
    
    return { top, left };
  }, [popoverType]);

  // Open the popover
  const openPopover = useCallback((element: HTMLElement, type: PopoverType) => {
    // Close any existing popovers first (enforcing single-popover stack)
    closeExistingPopovers();
    
    setPopoverType(type);
    setPosition(calculatePosition(element));
    setIsOpen(true);
  }, [calculatePosition]);

  // Close the popover
  const closePopover = useCallback(() => {
    setIsOpen(false);
    setPopoverType("none");
    if (onClose) onClose();
  }, [onClose]);

  // Close existing popovers in the DOM
  const closeExistingPopovers = useCallback(() => {
    // Force close any existing popovers in the DOM
    document.querySelectorAll('.popover-element').forEach(el => {
      if (el !== popoverRef.current) {
        el.remove();
      }
    });
  }, []);

  return {
    isOpen,
    position,
    popoverType,
    popoverRef,
    openPopover,
    closePopover
  };
}
