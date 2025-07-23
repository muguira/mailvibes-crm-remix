import { useEffect, useRef } from "react";

/**
 * Enhanced custom hook to fix Radix UI bug where body gets stuck with pointer-events: none
 * This is a known issue in production builds, especially on Vercel
 *
 * References:
 * - https://github.com/radix-ui/primitives/issues/2961
 * - https://github.com/radix-ui/primitives/issues/2450
 */
export function useRadixPointerEventsFix() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCleaningUpRef = useRef(false);

  useEffect(() => {
    // Check and fix pointer-events: none every 100ms
    intervalRef.current = setInterval(() => {
      if (isCleaningUpRef.current) return;
      
      if (document.body.style.pointerEvents === "none") {
        // Check if there are any open Radix dialogs/popovers that should keep it
        const hasOpenDialog = document.querySelector(
          "[data-radix-dialog-content]"
        );
        const hasOpenPopover = document.querySelector(
          "[data-radix-popover-content]"
        );
        const hasOpenSelect = document.querySelector(
          "[data-radix-select-content]"
        );
        const hasOpenDropdown = document.querySelector(
          "[data-radix-dropdown-menu-content]"
        );

        // If no dialogs/popovers are open, remove the pointer-events: none
        if (!hasOpenDialog && !hasOpenPopover && !hasOpenSelect && !hasOpenDropdown) {
          console.log('🔧 Fixing stuck pointer-events: none');
          document.body.style.pointerEvents = "";
        }
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      isCleaningUpRef.current = true;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Final cleanup
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
  }, []);

  // Enhanced function to manually force cleanup
  const forceCleanup = () => {
    if (isCleaningUpRef.current) return;
    
    console.log('🧹 Force cleaning pointer events');
    
    // Clear any stuck pointer-events styles
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
    }
    
    // Also check and clear any stuck overlay styles
    const overlays = document.querySelectorAll('[data-radix-presence]');
    overlays.forEach((overlay: Element) => {
      const htmlElement = overlay as HTMLElement;
      if (htmlElement.style.pointerEvents === "none") {
        htmlElement.style.pointerEvents = "";
      }
    });
  };

  return { forceCleanup };
}
