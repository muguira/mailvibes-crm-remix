import React, { RefObject, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import './grid-view/styles/scroll-buttons.css';

interface ScrollButtonsProps {
  /**
   * Ref to the MainGridView component that exposes scrollToTop and scrollToBottom methods
   */
  targetRef?: RefObject<{ scrollToTop: () => void; scrollToBottom: () => void }>;
}

/**
 * Floating buttons that let the user quickly jump to the top or bottom of a long list/grid.
 * They are positioned fixed at the bottom-right corner and become reusable across views.
 */
export const ScrollButtons: React.FC<ScrollButtonsProps> = ({ targetRef }) => {
  const scrollToTop = useCallback(() => {
    if (targetRef?.current?.scrollToTop) {
      targetRef.current.scrollToTop();
    } else {
      // Fallback to window scrolling if no ref is provided
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [targetRef]);

  const scrollToBottom = useCallback(() => {
    if (targetRef?.current?.scrollToBottom) {
      targetRef.current.scrollToBottom();
    } else {
      // Fallback to window scrolling if no ref is provided
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }
  }, [targetRef]);

  return (
    <div className="grid-scroll-buttons">
      <button type="button" aria-label="Scroll to top" className="scroll-button" onClick={scrollToTop}>
        <ChevronUp size={20} />
      </button>
      <button type="button" aria-label="Scroll to bottom" className="scroll-button" onClick={scrollToBottom}>
        <ChevronDown size={20} />
      </button>
    </div>
  );
}; 