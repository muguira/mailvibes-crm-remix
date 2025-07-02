import { useEffect } from "react";

/**
 * Custom hook to fix Radix UI bug where body gets stuck with pointer-events: none
 * This is a known issue in production builds, especially on Vercel
 *
 * References:
 * - https://github.com/radix-ui/primitives/issues/2961
 * - https://github.com/radix-ui/primitives/issues/2450
 */
export function useRadixPointerEventsFix() {
  useEffect(() => {
    // Check and fix pointer-events: none every 100ms
    const intervalId = setInterval(() => {
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

        // If no dialogs/popovers are open, remove the pointer-events: none
        if (!hasOpenDialog && !hasOpenPopover && !hasOpenSelect) {
          document.body.style.pointerEvents = "";
          console.log("🔧 Fixed stuck pointer-events: none on body");
        }
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
      // Final cleanup
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
  }, []);

  // Function to manually force cleanup
  const forceCleanup = () => {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = "";
      console.log("🔧 Manually fixed pointer-events: none");
    }
  };

  return { forceCleanup };
}
