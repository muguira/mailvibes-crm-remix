
import { useRef, useCallback, RefObject } from 'react';
import { SHORTCUTS } from '../grid-constants';

interface UseGridKeyboardProps {
  rowCount: number;
  columnCount: number;
  onCellFocus: (rowIndex: number, colIndex: number) => void;
  onCellEdit: (rowIndex: number, colIndex: number) => void;
  onCellEscape: () => void;
  onSearch: () => void;
  isEditing: boolean;
}

export function useGridKeyboard({
  rowCount,
  columnCount,
  onCellFocus,
  onCellEdit,
  onCellEscape,
  onSearch,
  isEditing
}: UseGridKeyboardProps) {
  // Store current focused cell position
  const focusedCell = useRef<{ row: number; col: number } | null>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // If no cell is focused, ignore keyboard events
    if (!focusedCell.current) return;

    const { row, col } = focusedCell.current;

    switch (e.key) {
      case SHORTCUTS.ARROW_UP:
        if (row > 0) {
          e.preventDefault();
          onCellFocus(row - 1, col);
        }
        break;
        
      case SHORTCUTS.ARROW_DOWN:
        if (row < rowCount - 1) {
          e.preventDefault();
          onCellFocus(row + 1, col);
        }
        break;
        
      case SHORTCUTS.ARROW_LEFT:
        if (col > 0) {
          e.preventDefault();
          onCellFocus(row, col - 1);
        }
        break;
        
      case SHORTCUTS.ARROW_RIGHT:
        if (col < columnCount - 1) {
          e.preventDefault();
          onCellFocus(row, col + 1);
        }
        break;
        
      case SHORTCUTS.TAB:
        e.preventDefault();
        if (e.shiftKey) {
          // Move backward
          if (col > 0) {
            onCellFocus(row, col - 1);
          } else if (row > 0) {
            onCellFocus(row - 1, columnCount - 1);
          }
        } else {
          // Move forward
          if (col < columnCount - 1) {
            onCellFocus(row, col + 1);
          } else if (row < rowCount - 1) {
            onCellFocus(row + 1, 0);
          }
        }
        break;
        
      case SHORTCUTS.ENTER:
        e.preventDefault();
        if (isEditing) {
          // Move down after editing
          if (row < rowCount - 1) {
            onCellFocus(row + 1, col);
          }
        } else {
          // Enter edit mode
          onCellEdit(row, col);
        }
        break;
        
      case SHORTCUTS.ESCAPE:
        if (isEditing) {
          e.preventDefault();
          onCellEscape();
        }
        break;
        
      case SHORTCUTS.FORWARD_SLASH:
        if (!isEditing && e.target === document.body) {
          e.preventDefault();
          onSearch();
        }
        break;
    }
  }, [rowCount, columnCount, onCellFocus, onCellEdit, onCellEscape, onSearch, isEditing]);

  // Update focused cell reference
  const setFocusedCell = useCallback((rowIndex: number, colIndex: number) => {
    focusedCell.current = { row: rowIndex, col: colIndex };
  }, []);

  return {
    handleKeyDown,
    setFocusedCell
  };
}

export default useGridKeyboard;
