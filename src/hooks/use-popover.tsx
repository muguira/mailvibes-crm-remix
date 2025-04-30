
import { useState, useEffect, useCallback, useRef } from "react";

export type PopoverType = "select" | "date" | "none";

interface UsePopoverOptions {
  onClose?: () => void;
  onSelect?: (value: any) => void;
}

export function usePopover({ onClose, onSelect }: UsePopoverOptions = {}) {
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

  // Handle collision detection and positioning
  const calculatePosition = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Default position (below the cell)
    let top = rect.bottom + 5;
    let left = rect.left;
    
    // Check if there's enough space below
    const hasSpaceBelow = viewportHeight - rect.bottom > 300; // Assume calendar height ~300px
    
    if (!hasSpaceBelow) {
      // Position above if not enough space below
      top = Math.max(5, rect.top - 300); // Don't go above viewport
    }
    
    // Handle horizontal overflow
    if (left + 300 > viewportWidth) { // Assume calendar width ~300px
      left = Math.max(5, viewportWidth - 305); // 5px padding from viewport edge
    }
    
    return { top, left };
  }, []);

  // Open the popover
  const openPopover = useCallback((element: HTMLElement, type: PopoverType) => {
    // Close any existing popovers first (enforcing single-popover stack)
    document.querySelectorAll('.popover-element').forEach(el => {
      // Force close any existing popovers in the DOM
      if (el !== popoverRef.current) {
        el.remove();
      }
    });
    
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

  // Handle selection and auto-close
  const handleSelect = useCallback((value: any) => {
    if (onSelect) onSelect(value);
    closePopover();
  }, [closePopover, onSelect]);

  return {
    isOpen,
    position,
    popoverType,
    popoverRef,
    openPopover,
    closePopover,
    handleSelect
  };
}
