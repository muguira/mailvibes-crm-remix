
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

  // Improved position calculation to place popover directly below or above the element
  const calculatePosition = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate popover dimensions (approximation)
    const popoverHeight = 300; // Calendar/dropdown height approximation
    const popoverWidth = 240;  // Calendar/dropdown width approximation
    
    // Default position (directly below the cell)
    let top = rect.bottom;
    let left = rect.left;
    
    // Check if there's enough space below
    const hasSpaceBelow = viewportHeight - rect.bottom > popoverHeight + 5;
    
    if (!hasSpaceBelow) {
      // Position directly above if not enough space below
      top = rect.top - popoverHeight;
    }
    
    // Center the dropdown horizontally relative to the cell if possible
    left = rect.left + (rect.width / 2) - (popoverWidth / 2);
    
    // Ensure the dropdown doesn't overflow horizontally
    if (left + popoverWidth > viewportWidth) {
      left = Math.max(5, viewportWidth - popoverWidth - 5);
    }
    
    if (left < 5) {
      left = 5; // Prevent positioning off-screen to the left
    }
    
    // Ensure top is not negative (off-screen)
    if (top < 5) {
      // If we can't fit it above, put it below instead, even if it's tight
      top = rect.bottom;
    }
    
    return { top, left };
  }, []);

  // Open the popover
  const openPopover = useCallback((element: HTMLElement, type: PopoverType) => {
    // Close any existing popovers first (enforcing single-popover stack)
    closeExistingPopovers();
    
    setPosition(calculatePosition(element));
    setPopoverType(type);
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
