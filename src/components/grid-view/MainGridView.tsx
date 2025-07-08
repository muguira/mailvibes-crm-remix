import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { Column, GridRow, EditingCell } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT } from './grid-constants';
import { ContextMenu } from './ContextMenu';
import { Check, X, Pin, PinOff } from 'lucide-react';
import './styles.css';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Command,
  CommandList,
  CommandGroup,
  CommandItem
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { GridCell } from './GridCell';
import { NewColumnModal } from './NewColumnModal';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';

export interface MainGridViewProps {
  columns: Column[];
  data: GridRow[];
  scrollLeft: number;
  containerWidth?: number;
  containerHeight?: number;
  onScroll: (scrollInfo: { scrollLeft: number; scrollTop: number }) => void;
  onCellChange: (rowId: string, columnId: string, value: any) => void;
  onColumnsReorder: (columnIds: string[]) => void;
  onAddColumn: (afterColumnId: string) => void;
  onInsertColumn: (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => void;
  onDeleteColumn: (columnId: string) => void;
  onHideColumn: (columnId: string) => void;
  onContextMenu: (columnId: string | null, position?: { x: number, y: number }) => void;
  contextMenuColumn?: string | null;
  contextMenuPosition?: { x: number, y: number } | null;
  onTogglePin: (columnId: string) => void;
  frozenColumnIds: string[];
  editingCell?: EditingCell | null;
  setEditingCell: (cell: EditingCell | null) => void;
  allColumns: Column[];
  selectedRowIds?: Set<string>;
}

export const MainGridView = forwardRef(function MainGridView({
  columns,
  data,
  scrollLeft,
  containerWidth,
  containerHeight,
  onScroll,
  onCellChange,
  onColumnsReorder,
  onAddColumn,
  onInsertColumn,
  onDeleteColumn,
  onHideColumn,
  onContextMenu,
  contextMenuColumn,
  contextMenuPosition,
  onTogglePin,
  frozenColumnIds,
  editingCell,
  setEditingCell,
  allColumns,
  selectedRowIds
}: MainGridViewProps, ref) {
  const gridRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string, columnId: string } | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>(columns.map(col => col.width));

  // Add optimistic updates state to immediately show changes locally
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});

  // Add ref to track recent saves to prevent double-saving
  const recentSavesRef = useRef<Set<string>>(new Set());

  // Modal state for column insertion
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    direction: 'left' | 'right';
    targetIndex: number;
  }>({
    isOpen: false,
    direction: 'left',
    targetIndex: 0,
  });

  // Expose scroll methods via ref
  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      if (gridRef.current?._outerRef) {
        gridRef.current._outerRef.scrollTo({
          top: 0,
          left: gridRef.current._outerRef.scrollLeft,
          behavior: 'smooth'
        });
      }
    },
    scrollToBottom: () => {
      if (gridRef.current?._outerRef) {
        const gridElement = gridRef.current._outerRef;
        gridElement.scrollTo({
          top: gridElement.scrollHeight,
          left: gridElement.scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }), []);

  // Add a special effect to preserve toolbar visibility on initial render
  useEffect(() => {
    // This helps ensure the toolbar stays visible when the component mounts
    // By preventing automatic focus on the grid container
    const preventInitialFocus = () => {
      if (document.activeElement === mainViewRef.current) {
        // If grid has focus on mount, blur it to keep toolbar visible
        (document.activeElement as HTMLElement).blur();
      }
    };

    // Run once on mount
    preventInitialFocus();

    // Also add a global class to ensure toolbar is never hidden
    document.body.classList.add('grid-view-active');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('grid-view-active');
      document.body.classList.remove('grid-keyboard-nav');
      document.body.classList.remove('grid-keyboard-nav-light');
      document.body.classList.remove('grid-scroll-active');
    };
  }, []);

  // Update the finishCellEdit function to clear selection after status changes
  const finishCellEdit = (rowId: string, columnId: string, value: any, targetRowId?: string, targetColumnId?: string) => {
    // First apply optimistic update locally (immediately)
    const cellKey = `${rowId}-${columnId}`;
    setOptimisticUpdates(prev => ({
      ...prev,
      [cellKey]: value
    }));

    // Save the edit immediately
    if (onCellChange) {
      onCellChange(rowId, columnId, value);
    }

    // Exit edit mode
    setEditingCell(null);

    // Check if this is a status column change
    const column = columns.find(col => col.id === columnId);
    if (column?.id === 'status') {
      // For status columns, completely clear the selection to prevent highlight issues
      setSelectedCell(null);
    } else if (targetRowId && targetColumnId) {
      // For other columns, set selection based on target
      setSelectedCell({ rowId: targetRowId, columnId: targetColumnId });
    } else {
      // Default selection to current cell
      setSelectedCell({ rowId, columnId });
    }

    // IMPORTANT: Do NOT force focus on the grid - this can make toolbar disappear
    // Only set focus if the element is already focused or we're in a keyboard navigation flow
    const isKeyboardNavigation = document.activeElement &&
      (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT');

    if (isKeyboardNavigation && mainViewRef.current) {
      // Only focus the grid for keyboard navigation, not clicks
      mainViewRef.current.focus();
    }

    // Clear optimistic update after server sync should complete
    setTimeout(() => {
      setOptimisticUpdates(prev => {
        const { [cellKey]: _, ...rest } = prev;
        return rest;
      });
    }, 1000); // Shorter delay to avoid any lag
  };

  // Update column widths when columns change
  useEffect(() => {
    // Create a fresh column widths array based on current columns
    // Always ensure each width is a valid number
    const newColumnWidths = columns.map(col =>
      typeof col.width === 'number' && !isNaN(col.width) ? col.width : 180
    );
    setColumnWidths(newColumnWidths);
  }, [columns]);

  // Reset grid layout when column widths change (e.g., on mobile resize)
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.resetAfterColumnIndex(0);
    }
  }, [columnWidths]);

  // Sync headers with grid scrolling
  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  // Ensure header scrolls in real time with the grid
  useEffect(() => {
    const gridElement = gridRef.current?._outerRef;
    if (!gridElement) return;

    const syncHeader = () => {
      if (headerRef.current) {
        headerRef.current.scrollLeft = gridElement.scrollLeft;
      }
    };

    gridElement.addEventListener('scroll', syncHeader, { passive: true });
    return () => {
      gridElement.removeEventListener('scroll', syncHeader);
    };
  }, []);

  // Track user-initiated scrolling vs programmatic scrolling
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track user-initiated scrolling vs programmatic scrolling for focus management

  // Handle scroll events - DON'T clear selection on scroll, keep it visible
  useEffect(() => {
    // Remove the scroll handlers that were clearing selection
    // The selection should persist during scrolling for better UX

    // Only track scroll state for programmatic vs user scrolling distinction
    const handleScrollStart = () => {
      // Mark as user-initiated scrolling
      isUserScrollingRef.current = true;

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Reset the flag after scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    // Apply to the grid if it exists
    if (gridRef.current && gridRef.current._outerRef) {
      const gridElement = gridRef.current._outerRef;

      // Only track scroll start for programmatic vs user distinction
      const passiveOpts = { passive: true } as const;
      gridElement.addEventListener('wheel', handleScrollStart, passiveOpts);
      gridElement.addEventListener('touchstart', handleScrollStart, passiveOpts);

      return () => {
        // Clean up event listeners
        gridElement.removeEventListener('wheel', handleScrollStart);
        gridElement.removeEventListener('touchstart', handleScrollStart);

        // Clear timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, []);

  // Update keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do nothing if context menu is open
      if (contextMenuColumn) return;

      // Stop handling if an input element has focus
      try {
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement instanceof HTMLSelectElement
        ) {
          return;
        }
      } catch (e) {
        logger.debug('Error checking active element:', e);
        return;
      }

      // Handle Cmd+F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        // Try multiple selectors to find the search input
        const searchInput =
          document.querySelector('input[placeholder="Search in grid..."]') ||
          document.querySelector('.search-input') ||
          document.querySelector('input[type="search"]') ||
          document.querySelector('input[placeholder*="Search"]');

        if (searchInput instanceof HTMLInputElement) {
          searchInput.focus();
          // Clear selection to prevent keyboard nav interference
          setSelectedCell(null);
        }
        return;
      }

      // Don't handle arrow keys if no cell is selected or if any popover/dropdown is open
      if (!selectedCell || document.querySelector("[data-state='open']") || document.querySelector(".status-options-popup")) return;

      // If we're editing, only handle Escape and Enter
      if (editingCell) {
        // These are handled by the input's onKeyDown event handler
        return;
      }

      const columnIndex = columns.findIndex(col => col.id === selectedCell.columnId);
      const rowIndex = data.findIndex(row => row.id === selectedCell.rowId);

      // Return if we couldn't find the current position
      if (columnIndex < 0 || rowIndex < 0) return;

      const column = columns[columnIndex];

      // Handle direct typing for date cells (numbers, slash, and dash keys)
      if (column?.type === 'date' && column?.editable) {
        // Allow typing digits and date separators directly into date cells
        if (
          (e.key >= '0' && e.key <= '9') || // Numbers
          e.key === '/' || e.key === '-'    // Common date separators
        ) {
          e.preventDefault();
          e.stopPropagation();

          // Start editing with the typed character, but flag it as direct typing
          // by adding a special property to prevent calendar from opening
          setEditingCell({
            rowId: selectedCell.rowId,
            columnId: selectedCell.columnId,
            directTyping: true // Add this flag
          });

          // Use a small timeout to let the input render, then set its value
          setTimeout(() => {
            try {
              const inputEl = document.querySelector(
                `.grid-cell[data-cell="${selectedCell.rowId}-${selectedCell.columnId}"] input`
              ) as HTMLInputElement | null;

              if (inputEl && document.contains(inputEl)) {
                inputEl.value = e.key;
                // Set cursor position after the typed character
                inputEl.selectionStart = 1;
                inputEl.selectionEnd = 1;
              }
            } catch (error) {
              logger.debug('Error setting input value during direct typing:', error);
            }
          }, 10);

          return;
        }
      }

      let newColumnIndex = columnIndex;
      let newRowIndex = rowIndex;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // Prevent any other handlers
          newRowIndex = Math.max(0, rowIndex - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // Prevent any other handlers
          newRowIndex = Math.min(data.length - 1, rowIndex + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // Prevent any other handlers
          newColumnIndex = Math.max(0, columnIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation(); // Prevent any other handlers
          newColumnIndex = Math.min(columns.length - 1, columnIndex + 1);
          break;
        case 'Tab':
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            // Shift+Tab: move left
            newColumnIndex = Math.max(0, columnIndex - 1);
            if (newColumnIndex === columnIndex && rowIndex > 0) {
              // If we're at the leftmost column, move up to the end of previous row
              newRowIndex = rowIndex - 1;
              newColumnIndex = columns.length - 1;
            }
          } else {
            // Tab: move right
            newColumnIndex = Math.min(columns.length - 1, columnIndex + 1);
            if (newColumnIndex === columnIndex && rowIndex < data.length - 1) {
              // If we're at the rightmost column, move down to the start of next row
              newRowIndex = rowIndex + 1;
              newColumnIndex = 0;
            }
          }
          break;
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          const column = columns[columnIndex];

          // When Enter is pressed on a selected cell, enter edit mode if possible
          if (column?.editable) {
            setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
            return; // Exit early to avoid changing selection
          } else {
            // If not editable, move down to next row
            newRowIndex = Math.min(data.length - 1, rowIndex + 1);
          }
          break;
        default:
          // For any other key press (letters, numbers), start editing if cell is editable
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const column = columns[columnIndex];
            if (column?.editable && column.type !== 'date') {
              e.preventDefault();
              e.stopPropagation();
              
              // Start editing with direct typing flag to prevent text selection
              setEditingCell({ 
                rowId: selectedCell.rowId, 
                columnId: selectedCell.columnId,
                directTyping: true,
                initialValue: e.key // Pass the first character
              });
              return; // Exit early to avoid changing selection
            }
          }
          break;
      }

      // Update selected cell if it changed
      if (newRowIndex !== rowIndex || newColumnIndex !== columnIndex) {
        const newRowId = data[newRowIndex]?.id;
        const newColumnId = columns[newColumnIndex]?.id;

        if (newRowId && newColumnId) {
          // Update selection
          setSelectedCell({ rowId: newRowId, columnId: newColumnId });

          // For single step movements (arrow keys), use ultra-fast scrollBySteps
          const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
          if (isArrowKey) {
            // First check if the new cell is visible - only scroll if it's outside viewport
            const gridElement = gridRef.current?._outerRef;
            if (gridElement) {
              const containerRect = gridElement.getBoundingClientRect();
              const cellTop = newRowIndex * ROW_HEIGHT;
              const cellBottom = cellTop + ROW_HEIGHT;
              const cellLeft = columns.slice(0, newColumnIndex).reduce((sum, col, idx) => sum + getColumnWidth(idx), 0);
              const cellRight = cellLeft + getColumnWidth(newColumnIndex);

              const currentScrollTop = gridElement.scrollTop;
              const currentScrollLeft = gridElement.scrollLeft;
              const visibleTop = currentScrollTop;
              const visibleBottom = currentScrollTop + containerRect.height - HEADER_HEIGHT;
              const visibleLeft = currentScrollLeft;
              const visibleRight = currentScrollLeft + containerRect.width;

              // Only scroll if the new cell is outside the visible area
              const isOutsideViewport = cellTop < visibleTop || cellBottom > visibleBottom ||
                cellLeft < visibleLeft || cellRight > visibleRight;

              if (isOutsideViewport) {
                // Use precise positioning when cell is outside viewport
                scrollToItemIfNeeded(newRowIndex, newColumnIndex);
              }
              // If cell is inside viewport, don't scroll at all
            }
          } else {
            // For larger movements (Tab, multi-step), use precise positioning
            scrollToItemIfNeeded(newRowIndex, newColumnIndex);
          }

          // Focus immediately without delays
          if (mainViewRef.current) {
            mainViewRef.current.focus({ preventScroll: true });
          }
        }
      }
    };

    // Add handler for keyboard navigation
    document.addEventListener('keydown', handleKeyDown);

    // Add click listener for the search input to handle focus management
    const setupSearchInputListeners = () => {
      try {
        const searchInputs = [
          document.querySelector('input[placeholder="Search in grid..."]'),
          document.querySelector('.search-input'),
          document.querySelector('input[type="search"]'),
          document.querySelector('input[placeholder*="Search"]')
        ].filter(Boolean);

        searchInputs.forEach(input => {
          if (input instanceof HTMLInputElement && document.contains(input)) {
            // When search input is clicked, clear cell selection to prevent keyboard nav interference
            const handleClick = () => {
              try {
                setSelectedCell(null);
              } catch (e) {
                logger.debug('Error clearing selection:', e);
              }
            };

            const handleFocus = () => {
              try {
                setSelectedCell(null);
              } catch (e) {
                logger.debug('Error clearing selection on focus:', e);
              }
            };

            input.addEventListener('click', handleClick);
            input.addEventListener('focus', handleFocus);
          }
        });
      } catch (e) {
        logger.debug('Error setting up search input listeners:', e);
      }
    };

    // Set up search input listeners
    setupSearchInputListeners();

    // Set up a mutation observer to detect dynamically added search inputs
    const observer = new MutationObserver(() => {
      setupSearchInputListeners();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      observer.disconnect();

      // Remove any navigation classes that might be left
      document.body.classList.remove('grid-keyboard-nav');
      document.body.classList.remove('grid-keyboard-nav-light');
      document.body.classList.remove('grid-scroll-active');
    };
  }, [selectedCell, editingCell, columns, data, contextMenuColumn]);

  // Add global click handler to handle clicking away properly
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!editingCell) return; // Only handle when actively editing

      const target = e.target as HTMLElement;

      // If target is inside the status popup, don't close it
      if (target.closest('.status-options-popup') || target.closest('.status-popup-header')) {
        return;
      }

      // If target is inside the calendar or date popup, don't close it
      if (target.closest('.date-options-popup') ||
        target.closest('.react-calendar') ||
        target.closest('[role="dialog"][aria-label*="calendar"]') ||
        target.closest('[data-radix-popper-content-wrapper]')) {
        return;
      }

      // If target is already handled by a cell click, ignore
      if (target.closest('.grid-cell')) {
        return;
      }

      // Check if clicking on toolbar or UI elements
      const isUIElement = (
        target.closest('.grid-toolbar') ||
        target.closest('header') ||
        target.closest('nav') ||
        target.closest('button') ||
        target.closest('.search-field-container') ||
        target.closest('.search-input') ||
        target.closest('input[type="search"]')
      );

      // Get the input element with the current value
      const inputEl = document.querySelector(
        `.grid-cell[data-cell="${editingCell.rowId}-${editingCell.columnId}"] input,` +
        `.grid-cell[data-cell="${editingCell.rowId}-${editingCell.columnId}"] select`
      ) as HTMLInputElement | HTMLSelectElement | null;

      // Save the edit
      if (inputEl && 'value' in inputEl) {
        // Apply optimistic UI update immediately
        const key = `${editingCell.rowId}-${editingCell.columnId}`;
        setOptimisticUpdates(prev => ({
          ...prev,
          [key]: inputEl.value
        }));

        // Save immediately
        if (onCellChange) {
          onCellChange(editingCell.rowId, editingCell.columnId, inputEl.value);

          // Clear optimistic update after a short time
          setTimeout(() => {
            setOptimisticUpdates(prev => {
              const { [key]: _, ...rest } = prev;
              return rest;
            });
          }, 500); // Use a shorter delay of 500ms
        }
      }

      // IMPORTANT: Maintain search bar visibility by not focusing the grid
      // If clicking UI elements, just cancel edit mode without re-focusing grid
      if (isUIElement) {
        setEditingCell(null);
      } else {
        // For non-UI areas outside the grid, clear both editing and selection
        setEditingCell(null);
        setSelectedCell(null);
      }
    };

    // Use standard (non-capture) event listener
    document.addEventListener('mousedown', handleGlobalClick);

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [editingCell, onCellChange]);

  // Update the handleCellClick function to properly handle status selection
  const handleCellClick = (rowId: string, columnId: string, e?: React.MouseEvent) => {
    // Stop propagation if provided
    if (e) {
      e.stopPropagation();
    }

    // Get the column for behavior checks
    const column = columns.find(col => col.id === columnId);

    // If clicking on the same cell that's being edited, do nothing
    if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
      return;
    }

    // If we're editing a different cell and clicking this cell, save the current edit first
    if (editingCell) {
      // Get current input value
      const inputEl = document.querySelector(
        `.grid-cell[data-cell="${editingCell.rowId}-${editingCell.columnId}"] input,` +
        `.grid-cell[data-cell="${editingCell.rowId}-${editingCell.columnId}"] select`
      ) as HTMLInputElement | HTMLSelectElement | null;

      if (inputEl && 'value' in inputEl) {
        // Save the current edit with optimistic update
        const key = `${editingCell.rowId}-${editingCell.columnId}`;
        setOptimisticUpdates(prev => ({
          ...prev,
          [key]: inputEl.value
        }));

        if (onCellChange) {
          onCellChange(editingCell.rowId, editingCell.columnId, inputEl.value);

          // Clear optimistic update after server sync should complete
          setTimeout(() => {
            setOptimisticUpdates(prev => {
              const { [key]: _, ...rest } = prev;
              return rest;
            });
          }, 2000);
        }
      }

      // Exit edit mode
      setEditingCell(null);
    }

    // Special handling for status column - open dropdown on first click
    if (column?.id === 'status' && column.editable) {
      setSelectedCell({ rowId, columnId });
      setEditingCell({ rowId, columnId });
      return;
    }

    // Check if clicking on a cell that's already selected
    const isClickingSameSelectedCell = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId;

    // For regular cell selection
    if (!isClickingSameSelectedCell) {
      setSelectedCell({ rowId, columnId });
    } else if (column?.editable) {
      // Double click behavior - entering edit mode on second click
      setEditingCell({ rowId, columnId });
    }
  };

  // Critical fix: For Tab navigation to keep toolbar visible while maintaining proper selection and focus
  const handleTabNavigation = (e: React.KeyboardEvent, rowId: string, columnId: string, value: any) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent the event from bubbling up

    // Mark this cell as recently saved to prevent double-save in blur handler
    const cellKey = `${rowId}-${columnId}`;
    recentSavesRef.current.add(cellKey);

    // Get current position
    const rowIndex = data.findIndex(row => row.id === rowId);
    const columnIndex = columns.findIndex(col => col.id === columnId);

    // Apply optimistic update immediately
    setOptimisticUpdates(prev => ({
      ...prev,
      [cellKey]: value
    }));

    // Save changes first so they're immediately applied
    if (onCellChange) {
      onCellChange(rowId, columnId, value);
    }

    // Exit edit mode
    setEditingCell(null);

    // Calculate the next cell position - directly adjacent cell
    let nextColumnIndex = columnIndex;
    let nextRowIndex = rowIndex;

    if (e.shiftKey) {
      // Shift+Tab: move left one column
      nextColumnIndex = Math.max(0, columnIndex - 1);
      if (nextColumnIndex === columnIndex && rowIndex > 0) {
        // If at leftmost column, move up to end of previous row
        nextRowIndex = rowIndex - 1;
        nextColumnIndex = columns.length - 1;
      }
    } else {
      // Tab: move right one column only
      nextColumnIndex = columnIndex + 1;
      if (nextColumnIndex >= columns.length && rowIndex < data.length - 1) {
        // If at rightmost column, move down to start of next row
        nextRowIndex = rowIndex + 1;
        nextColumnIndex = 0;
      }
    }

    // Ensure we don't go beyond boundaries
    nextColumnIndex = Math.min(nextColumnIndex, columns.length - 1);
    nextRowIndex = Math.min(nextRowIndex, data.length - 1);

    // Get IDs for the next cell
    const nextRowId = data[nextRowIndex]?.id;
    const nextColumnId = columns[nextColumnIndex]?.id;

    // Update selection without auto-scrolling
    if (nextRowId && nextColumnId) {
      // First update the selected cell
      setSelectedCell({ rowId: nextRowId, columnId: nextColumnId });

      // Use optimized scroll helper
      scrollToItemIfNeeded(nextRowIndex, nextColumnIndex);

      // Focus immediately without delays
      if (mainViewRef.current) {
        mainViewRef.current.focus({ preventScroll: true });
      }
    }

    // Clear the recent save flag after a short delay
    setTimeout(() => {
      recentSavesRef.current.delete(cellKey);
    }, 100);
  };

  // Handle cell editing keydown with careful focus management 
  const handleEditingKeyDown = (e: React.KeyboardEvent, rowId: string, columnId: string, value: any) => {
    if (e.key === 'Tab') {
      // Use the dedicated Tab handler for better accuracy
      handleTabNavigation(e, rowId, columnId, value);
      return;
    }

    const rowIndex = data.findIndex(row => row.id === rowId);
    const columnIndex = columns.findIndex(col => col.id === columnId);

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Stop event propagation to prevent unexpected behavior

      // Mark this cell as recently saved to prevent double-save in blur handler
      const cellKey = `${rowId}-${columnId}`;
      recentSavesRef.current.add(cellKey);

      // Apply optimistic update immediately
      setOptimisticUpdates(prev => ({
        ...prev,
        [cellKey]: value
      }));

      // Exit edit mode first to stop the input
      setEditingCell(null);

      // Save the edit immediately without clearing selection
      if (onCellChange) {
        onCellChange(rowId, columnId, value);
      }

      // Target handling - simplified to reduce DOM operations
      let targetRowId: string | undefined;
      let targetRowIndex = rowIndex;

      if (e.shiftKey && rowIndex > 0) {
        targetRowIndex = rowIndex - 1;
        targetRowId = data[targetRowIndex].id;
      } else if (rowIndex < data.length - 1) {
        targetRowIndex = rowIndex + 1;
        targetRowId = data[targetRowIndex].id;
      }

      if (targetRowId) {
        // First update the selected cell
        setSelectedCell({ rowId: targetRowId, columnId });

        // Use optimized scroll helper
        scrollToItemIfNeeded(targetRowIndex, columnIndex);

        // Focus immediately without delays
        if (mainViewRef.current) {
          mainViewRef.current.focus({ preventScroll: true });
        }
      }

      // Clear the recent save flag after a short delay
      setTimeout(() => {
        recentSavesRef.current.delete(cellKey);
      }, 100);
    } else if (e.key === 'Escape') {
      // Cancel editing without saving
      e.preventDefault();
      e.stopPropagation();
      setEditingCell(null);
      setSelectedCell({ rowId, columnId });

      // Focus immediately without delays
      if (mainViewRef.current) {
        mainViewRef.current.focus({ preventScroll: true });
      }
    }
  };

  // Handle cell value change
  const handleCellChange = (rowId: string, columnId: string, value: any, moveToNextRow = false) => {
    // Save the change with the callback
    if (onCellChange) {
      onCellChange(rowId, columnId, value);
    }

    // Get column to check if it's a status type
    const column = columns.find(col => col.id === columnId);
    const rowIndex = data.findIndex(row => row.id === rowId);

    // Clear editing state
    setEditingCell(null);

    // Different behavior based on column type and whether we should move to next row
    if (column?.type === 'status') {
      // For status cells, clear selection completely
      setSelectedCell(null);
    } else if (moveToNextRow && rowIndex >= 0 && rowIndex < data.length - 1) {
      // Move to next row ONLY if Enter was pressed (moveToNextRow=true)
      const nextRowId = data[rowIndex + 1].id;
      setSelectedCell({ rowId: nextRowId, columnId });
    } else {
      // Keep selection on the same cell
      setSelectedCell({ rowId, columnId });
    }

    // Reset focus to the main grid immediately
    if (mainViewRef.current) {
      mainViewRef.current.focus({ preventScroll: true });
    }
  };

  // Handle grid scroll event
  const handleGridScroll = ({ scrollLeft, scrollTop }: { scrollLeft: number; scrollTop: number }) => {
    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
    onScroll({ scrollLeft, scrollTop });
  };

  // Handle header drag/drop for column reordering
  const handleHeaderDragStart = (e: React.DragEvent, columnId: string) => {
    e.dataTransfer.setData('text/plain', columnId);
  };

  const handleHeaderDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const sourceColumnId = e.dataTransfer.getData('text/plain');

    if (sourceColumnId === targetColumnId) return;

    if (onColumnsReorder) {
      const sourceIndex = columns.findIndex(col => col.id === sourceColumnId);
      const targetIndex = columns.findIndex(col => col.id === targetColumnId);

      if (sourceIndex < 0 || targetIndex < 0) return;

      // Create new columns array with proper Column objects
      const newColumns = [...columns];
      const [movedColumn] = newColumns.splice(sourceIndex, 1);
      newColumns.splice(targetIndex, 0, movedColumn);

      onColumnsReorder(newColumns.map(col => col.id));
    }
  };

  // Handle header context menu
  const handleHeaderContextMenu = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(columnId, { x: e.clientX, y: e.clientY });
    }
  };

  // Handle cell context menu
  const handleCellContextMenu = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(columnId, { x: e.clientX, y: e.clientY });
    }
  };

  // Column width getter
  const getColumnWidth = useCallback((index: number) => {
    // Ensure we always return a valid number, never NaN or undefined
    const width = columnWidths[index];
    // Use default width if the width is NaN, undefined, or not a number
    return (width !== undefined && !isNaN(width)) ? width : 180;
  }, [columnWidths]);

  // Calculate total grid width - memoized to prevent infinite re-renders
  const totalWidth = useMemo(() => {
    return columnWidths.reduce((sum, width) => {
      // Ensure we only add valid numbers
      const validWidth = typeof width === 'number' && !isNaN(width) ? width : 180;
      return sum + validWidth;
    }, 0);
  }, [columnWidths]);

  // Common blur handler to detect clicks on other cells - with double-save prevention
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, rowId: string, columnId: string, value: any) => {
    // Check if we recently saved this cell to prevent double-save
    const cellKey = `${rowId}-${columnId}`;
    if (recentSavesRef.current.has(cellKey)) {
      // This cell was recently saved via Tab/Enter, don't save again
      return;
    }

    // Save the edit immediately on blur
    if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
      finishCellEdit(rowId, columnId, value);
    }
  };

  // Format cell value with optimistic updates
  const formatCellValue = (value: any, column: Column, row?: GridRow) => {
    if (!row) return '';

    // Check if we have an optimistic update for this cell
    const optimisticValue = optimisticUpdates[`${row.id}-${column.id}`];
    if (optimisticValue !== undefined) {
      // Use the optimistic value instead
      value = optimisticValue;
    }

    if (value === undefined || value === null) return '';

    // If the column has a custom render function, use it
    if (column.renderCell && row) {
      return column.renderCell(value, row);
    }

    switch (column.type) {
      case 'currency':
        const currencyCode = column.currencyType || 'USD';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Number(value));
      case 'status':
        return renderStatusPill(value, column.colors || {});
      case 'date':
        try {
          // Try to parse the date and format it consistently
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return format(date, 'MMM d, yyyy');
          }
        } catch (e) {
          // If there's any error in parsing, just return the original value
        }
        return value;
      default:
        return String(value);
    }
  };

  // Render status pill
  const renderStatusPill = (value: string, colors: Record<string, string>) => {
    if (!value) return null;

    const backgroundColor = colors[value] || '#f3f4f6';
    const isLight = isColorLight(backgroundColor);
    const textColor = isLight ? '#000000' : '#ffffff';

    return (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor, color: textColor }}
      >
        {value}
      </span>
    );
  };

  // Helper function to determine if color is light
  const isColorLight = (color: string): boolean => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  };

  // Reset all selections when anything interacts with a status dropdown
  useEffect(() => {
    if (editingCell) {
      const column = columns.find(col => col.id === editingCell.columnId);

      // If we're editing a status cell, ensure no dual selections can occur
      if (column?.type === 'status') {
        // Only allow one selection - the one we're editing
        const cellsWithSelection = document.querySelectorAll('.selected-cell');
        if (cellsWithSelection.length > 1) {
          // Clear all selections and re-apply only to the current cell
          setSelectedCell(null);

          // Small delay before restoring the correct selection
          setTimeout(() => {
            setSelectedCell({ rowId: editingCell.rowId, columnId: editingCell.columnId });
          }, 10);
        }
      }
    }
  }, [editingCell, columns]);

  // Cell renderer
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number, rowIndex: number, style: React.CSSProperties }) => {
    if (rowIndex >= data.length || columnIndex >= columns.length) return null;
    
    const row = data[rowIndex];
    const column = columns[columnIndex];
    const cellValue = row[column.id];
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
    const isSelected = selectedCell?.rowId === row.id && selectedCell?.columnId === column.id;
    const isRowSelected = selectedRowIds && selectedRowIds.has(row.id);
    const isColumnHighlighted = contextMenuColumn === column.id;
    
    // Check for optimistic update
    const optimisticValue = optimisticUpdates[`${row.id}-${column.id}`];
    const displayValue = optimisticValue !== undefined ? optimisticValue : cellValue;
    
    // Build class names
    const cellClassName = cn(
      'grid-cell',
      isSelected && 'selected-cell',
      isRowSelected && 'selected-row',
      isColumnHighlighted && 'highlight-column'
    );
    
    // For status cells with colors
    const statusColors = column.type === 'status' && column.colors ? column.colors : {};
    
    return (
      <div
        className={cellClassName}
        style={{
          ...style,
          backgroundColor: isRowSelected ? '#f0f9ff' : undefined,
        }}
        onClick={(e) => handleCellClick(row.id, column.id, e)}
        onContextMenu={(e) => handleCellContextMenu(e, column.id)}
        data-editable={column.editable}
        data-type={column.type}
        tabIndex={-1}
      >
        {isEditing ? (
          <EditCell
            rowId={row.id}
            columnId={column.id}
            value={displayValue}
            column={column}
            onFinishEdit={finishCellEdit}
            onBlur={(e) => handleInputBlur(e, row.id, column.id, (e.target as HTMLInputElement | HTMLSelectElement).value)}
            onKeyDown={(e) => handleEditingKeyDown(e, row.id, column.id, (e.target as HTMLInputElement | HTMLSelectElement).value)}
            onTabNavigation={(e) => handleTabNavigation(e, row.id, column.id, (e.target as HTMLInputElement | HTMLSelectElement).value)}
            directTyping={editingCell?.directTyping}
            clearDateSelection={editingCell?.clearDateSelection}
            initialValue={(editingCell as any)?.initialValue}
          />
        ) : column.type === 'status' && statusColors ? (
          renderStatusPill(displayValue, statusColors)
        ) : column.renderCell ? (
          column.renderCell(displayValue, row)
        ) : (
          <div className="cell-content">
            {formatCellValue(displayValue, column, row) || ''}
          </div>
        )}
      </div>
    );
  };

  // Context menu actions
  const handleCopyColumn = (columnId: string) => {
    logger.log(`Copy column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handlePasteColumn = (columnId: string) => {
    logger.log(`Paste into column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleInsertLeft = (columnIndex: number) => {
    logger.log(`Insert column left of index: ${columnIndex}`);

    // Calculate the global column index by finding the column ID in the full columns array
    const columnId = columns[columnIndex]?.id;
    const globalIndex = allColumns ? allColumns.findIndex(col => col.id === columnId) : columnIndex;

    setModalState({
      isOpen: true,
      direction: 'left',
      targetIndex: globalIndex,
    });
    if (onContextMenu) onContextMenu(null);
  };

  const handleInsertRight = (columnIndex: number) => {
    logger.log(`Insert column right of index: ${columnIndex}`);

    // Calculate the global column index by finding the column ID in the full columns array
    const columnId = columns[columnIndex]?.id;
    const globalIndex = allColumns ? allColumns.findIndex(col => col.id === columnId) : columnIndex;

    // Don't allow adding columns after lastContacted
    const column = columns[columnIndex];
    if (column?.id === 'lastContacted') {
      logger.log("Cannot add columns after lastContacted");
      if (onContextMenu) onContextMenu(null);
      return;
    }

    setModalState({
      isOpen: true,
      direction: 'right',
      targetIndex: globalIndex,
    });
    if (onContextMenu) onContextMenu(null);
  };

  // Modal handlers
  const handleModalConfirm = (headerName: string, columnType: string, config?: any) => {
    if (onInsertColumn) {
      onInsertColumn(modalState.direction, modalState.targetIndex, headerName, columnType, config);
    }
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalCancel = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteColumn = (columnId: string) => {
    logger.log(`Delete column: ${columnId}`);
    
    // Just call onDeleteColumn for all columns - the parent component will handle the confirmation
    if (onDeleteColumn) onDeleteColumn(columnId);
    
    if (onContextMenu) onContextMenu(null);
  };

  const handleSortAZ = (columnId: string) => {
    logger.log(`Sort sheet A-Z by column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleSortZA = (columnId: string) => {
    logger.log(`Sort sheet Z-A by column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  // Helper function for ultra-fast keyboard navigation scrolling (like Google Sheets)
  const scrollToItemIfNeeded = useCallback((rowIndex: number, columnIndex: number) => {
    if (!gridRef.current) return;

    const gridElement = gridRef.current._outerRef;
    if (!gridElement) return;

    try {
      const containerRect = gridElement.getBoundingClientRect();
      const rowHeight = ROW_HEIGHT;
      const columnWidth = getColumnWidth(columnIndex);

      // Calculate current scroll position
      const currentScrollTop = gridElement.scrollTop;
      const currentScrollLeft = gridElement.scrollLeft;

      // Calculate cell position
      const cellTop = rowIndex * rowHeight;
      const cellBottom = cellTop + rowHeight;
      const cellLeft = columns.slice(0, columnIndex).reduce((sum, col, idx) => sum + getColumnWidth(idx), 0);
      const cellRight = cellLeft + columnWidth;

      // Calculate visible area
      const visibleTop = currentScrollTop;
      const visibleBottom = currentScrollTop + containerRect.height - HEADER_HEIGHT;
      const visibleLeft = currentScrollLeft;
      const visibleRight = currentScrollLeft + containerRect.width;

      // Check if scrolling is needed
      const needsVerticalScroll = cellTop < visibleTop || cellBottom > visibleBottom;
      const needsHorizontalScroll = cellLeft < visibleLeft || cellRight > visibleRight;

      if (needsVerticalScroll || needsHorizontalScroll) {
        // Use native DOM scrolling for instant results (like Google Sheets)
        let newScrollTop = currentScrollTop;
        let newScrollLeft = currentScrollLeft;

        // Calculate optimal scroll position for vertical scrolling
        if (needsVerticalScroll) {
          if (cellTop < visibleTop) {
            // Scroll up - position cell at top
            newScrollTop = cellTop;
          } else if (cellBottom > visibleBottom) {
            // Scroll down - position cell at bottom
            newScrollTop = cellBottom - (containerRect.height - HEADER_HEIGHT);
          }
        }

        // Calculate optimal scroll position for horizontal scrolling
        if (needsHorizontalScroll) {
          if (cellLeft < visibleLeft) {
            // Scroll left - position cell at left edge
            newScrollLeft = cellLeft;
          } else if (cellRight > visibleRight) {
            // Scroll right - position cell at right edge
            newScrollLeft = cellRight - containerRect.width;
          }
        }

        // Use native scrollTo for instant scrolling (no animation delays)
        gridElement.scrollTo({
          top: Math.max(0, newScrollTop),
          left: Math.max(0, newScrollLeft),
          behavior: 'instant' // Instant scroll like Google Sheets
        });

        // Sync the header immediately
        if (headerRef.current) {
          headerRef.current.scrollLeft = Math.max(0, newScrollLeft);
        }

        // Update our internal scroll state immediately
        onScroll({
          scrollTop: Math.max(0, newScrollTop),
          scrollLeft: Math.max(0, newScrollLeft)
        });
      }
    } catch (error) {
      // Fallback to react-window scroll only if native fails
      logger.debug('Error in native scroll, falling back to react-window scroll:', error);
      if (gridRef.current?.scrollToItem) {
        gridRef.current.scrollToItem({
          columnIndex,
          rowIndex,
          align: 'auto'
        });
      }
    }
  }, [columns, getColumnWidth, onScroll]);

  return (
    <div
      className="main-grid-view"
      ref={mainViewRef}
      tabIndex={0}
    >
      {/* Header row */}
      <div
        className="main-grid-header"
        ref={headerRef}
        style={{
          height: HEADER_HEIGHT,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <div className="grid-header-row" style={{ width: totalWidth, display: 'flex', boxSizing: 'border-box' }}>
          {columns.map((column, index) => (
            <div
              key={column.id}
              className={`grid-header-cell group ${column.id === contextMenuColumn ? 'highlight-column' : ''}${index === 0 ? ' grid-header-cell-first-scrollable' : ''}`}
              style={{
                width: column.width,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                borderLeft: index === 0 ? '1px solid #e5e7eb' : undefined,
              }}
              draggable
              onDragStart={(e) => handleHeaderDragStart(e, column.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleHeaderDrop(e, column.id)}
              onContextMenu={(e) => handleHeaderContextMenu(e, column.id)}
            >
              <span
                className={`pin-icon mr-2 md:ml-2 md:mr-0 md:order-last ${frozenColumnIds.includes(column.id) ? 'text-brand-teal' : 'text-gray-400'} md:group-hover:opacity-100 md:opacity-0 hidden md:block`}
                style={{ 
                  cursor: 'pointer', 
                  transition: 'opacity 0.2s',
                  // Hide pin icon for name column since it's always pinned
                  display: column.id === 'name' ? 'none' : 'flex'
                }}
                onClick={e => { e.stopPropagation(); onTogglePin(column.id); }}
              >
                {frozenColumnIds.includes(column.id) ? (
                  <PinOff size={16} />
                ) : (
                  <Pin size={16} />
                )}
              </span>
              <span style={{ flex: 1 }}>{column.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid body */}
      <div className="main-grid-body">
        <Grid
          ref={gridRef}
          className="data-grid"
          columnCount={columns.length}
          columnWidth={getColumnWidth}
          rowCount={data.length}
          rowHeight={() => ROW_HEIGHT}
          width={containerWidth || 300}
          height={(containerHeight || 300) - HEADER_HEIGHT}
          onScroll={handleGridScroll}
          overscanRowCount={20}
          overscanColumnCount={5}
          estimatedRowHeight={ROW_HEIGHT}
          useIsScrolling={false}
          style={{
            overflowX: 'scroll',
            overflowY: 'scroll',
            width: '100%',
            boxSizing: 'border-box',
            paddingBottom: '40px'
          }}
        >
          {Cell}
        </Grid>
      </div>

      {/* Context Menu */}
      {contextMenuColumn && contextMenuPosition && (
        <ContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          columnId={contextMenuColumn}
          columnIndex={columns.findIndex(col => col.id === contextMenuColumn)}
          onClose={() => onContextMenu && onContextMenu(null)}
          onCopy={handleCopyColumn}
          onPaste={handlePasteColumn}
          onInsertLeft={handleInsertLeft}
          onInsertRight={handleInsertRight}
          onDelete={handleDeleteColumn}
          onHide={(columnId) => {
            // Allow hiding any column directly from context menu
            if (onHideColumn) {
              onHideColumn(columnId);
            }
            if (onContextMenu) onContextMenu(null);
          }}
          onSortAZ={handleSortAZ}
          onSortZA={handleSortZA}
          isVisible={!!contextMenuColumn}
        />
      )}

      {/* New Column Modal */}
      <NewColumnModal
        isOpen={modalState.isOpen}
        initialDirection={modalState.direction}
        targetIdx={modalState.targetIndex}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  );
});

// Add EditCell component
const EditCell = ({
  rowId,
  columnId,
  value,
  column,
  onFinishEdit,
  onBlur,
  onKeyDown,
  onTabNavigation,
  directTyping,
  clearDateSelection,
  initialValue
}: {
  rowId: string;
  columnId: string;
  value: any;
  column: Column;
  onFinishEdit: (rowId: string, columnId: string, value: any, targetRowId?: string, targetColumnId?: string) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onTabNavigation: (e: React.KeyboardEvent) => void;
  directTyping?: boolean;
  clearDateSelection?: boolean;
  initialValue?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      
      // For direct typing, don't select text and set the initial character
      if (directTyping) {
        // Don't select text for direct typing
        if (initialValue) {
          inputRef.current.value = initialValue;
          // Set cursor position after the typed character
          inputRef.current.selectionStart = 1;
          inputRef.current.selectionEnd = 1;
        }
      } else {
        // For double-click or Enter, select all text
        inputRef.current.select();
      }
    } else if (selectRef.current) {
      selectRef.current.focus();
    }
  }, [directTyping, initialValue]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onFinishEdit(rowId, columnId, date.toISOString());
      setDatePickerOpen(false);
    }
  };

  // Handle select change
  const handleSelectChange = (value: string) => {
    onFinishEdit(rowId, columnId, value);
  };

  // Render based on column type
  switch (column.type) {
    case 'status':
      return (
        <Select
          defaultValue={value || ''}
          onValueChange={handleSelectChange}
        >
          <SelectTrigger 
            className="h-full w-full border-none shadow-none focus:ring-0"
            ref={selectRef as any}
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {column.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    
    case 'date':
      return (
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <button
              className="w-full h-full text-left px-2 focus:outline-none"
              onClick={() => setDatePickerOpen(true)}
            >
              {selectedDate ? format(selectedDate, 'PP') : 'Select date'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    
    default:
      return (
        <input
          ref={inputRef}
          type={column.type === 'number' || column.type === 'currency' ? 'number' : 'text'}
          defaultValue={directTyping ? '' : (value || '')}
          className="w-full h-full px-2 bg-transparent border-none focus:outline-none focus:ring-0"
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              onTabNavigation(e);
            } else {
              onKeyDown(e);
            }
          }}
        />
      );
  }
}; 