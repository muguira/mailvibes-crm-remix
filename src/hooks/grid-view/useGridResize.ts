import { useEffect } from 'react'

/**
 * Custom hook for handling responsive grid resize events
 *
 * Manages window resize events to adjust grid column widths and layout
 * based on screen size changes. This ensures the grid remains responsive
 * and properly laid out across different device sizes.
 *
 * @param resizeHandler - Function to handle resize operations
 * @returns void
 *
 * @example
 * ```tsx
 * useGridResize(editableLeadsGridHandleResize);
 * ```
 */
export const useGridResize = (resizeHandler: () => void) => {
  useEffect(() => {
    // Execute resize handler immediately on mount to set initial state
    resizeHandler()

    // Add resize event listener to handle window size changes
    window.addEventListener('resize', resizeHandler)

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('resize', resizeHandler)
    }
  }, [resizeHandler])
}
