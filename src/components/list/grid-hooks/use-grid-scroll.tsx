
import { useEffect, RefObject } from "react";

export function useGridScroll(
  headerRef: RefObject<HTMLDivElement>,
  bodyRef: RefObject<HTMLDivElement>,
) {
  // Sync scrolling between header and body
  useEffect(() => {
    const headerEl = headerRef.current;
    const bodyEl = bodyRef.current;
    
    if (!headerEl || !bodyEl) return;
    
    const handleBodyScroll = () => {
      if (headerEl) {
        headerEl.scrollLeft = bodyEl.scrollLeft;
      }
    };
    
    bodyEl.addEventListener('scroll', handleBodyScroll);
    return () => {
      bodyEl.removeEventListener('scroll', handleBodyScroll);
    };
  }, [headerRef, bodyRef]);
}
