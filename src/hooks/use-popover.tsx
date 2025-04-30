
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

  // Enhanced position calculation to ensure popover is always properly positioned
  const calculatePosition = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Get more accurate popover dimensions based on type
    const popoverHeight = popoverType === 'date' ? 380 : 250; // Calendar is taller than dropdown
    const popoverWidth = popoverType === 'date' ? 300 : 240;
    
    // Space needed above/below for the popover plus a small gap
    const spaceNeeded = popoverHeight + 5;
    
    // Check if there's enough space below the element
    const spaceBelow = viewportHeight - rect.bottom;
    const placeBelow = spaceBelow >= spaceNeeded;
    
    // Calculate vertical position
    let top;
    if (placeBelow) {
      // Position below with 2px gap
      top = rect.bottom + 2;
    } else {
      // Position above with 2px gap (if there's space)
      top = rect.top - popoverHeight - 2;
      
      // If positioning above would go off-screen, force to top of screen with padding
      if (top < 5) {
        // As a last resort, align to top of viewport with minimal padding
        top = 5;
      }
    }
    
    // Calculate horizontal position (centered on the element)
    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
    
    // Prevent horizontal overflow
    if (left + popoverWidth > viewportWidth - 5) {
      left = viewportWidth - popoverWidth - 5; // 5px from right edge
    }
    
    // Prevent left overflow
    if (left < 5) {
      left = 5; // 5px from left edge
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
