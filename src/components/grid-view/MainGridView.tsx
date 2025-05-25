import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { Column, GridRow } from './types';
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
import { CannotDeleteColumnModal } from './CannotDeleteColumnModal';

interface MainGridViewProps {
  columns: Column[];
  data: GridRow[];
  scrollTop: number;
  scrollLeft: number;
  containerWidth: number;
  containerHeight: number;
  onScroll: (scroll: { scrollTop: number; scrollLeft: number }) => void;
  onCellChange: (rowId: string, columnId: string, value: any) => void;
  onColumnChange: (columnId: string, changes: Partial<Column>) => void;
  onColumnsReorder: (columns: Column[]) => void;
  onAddColumn: () => void;
  onInsertColumn?: (direction: 'left' | 'right', targetIndex: number, headerName: string, columnType: string, config?: any) => void;
  onDeleteColumn: (columnId: string) => void;
  onHideColumn?: (columnId: string) => void;
  onContextMenu: (columnId: string | null, position?: { x: number; y: number }) => void;
  contextMenuColumn: string | null;
  contextMenuPosition: { x: number; y: number } | null;
  onTogglePin: (columnId: string) => void;
  frozenColumnIds: string[];
  editingCell: { rowId: string; columnId: string } | null;
  setEditingCell: (cell: { rowId: string; columnId: string } | null) => void;
  allColumns?: Column[];
}

export function MainGridView({
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
  allColumns
}: MainGridViewProps) {
  const gridRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string, columnId: string } | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>(columns.map(col => col.width));

  // Add optimistic updates state to immediately show changes locally
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});

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

  // Modal state for cannot delete column
  const [cannotDeleteModalState, setCannotDeleteModalState] = useState<{
    isOpen: boolean;
    columnId: string;
    columnName: string;
  }>({
    isOpen: false,
    columnId: '',
    columnName: '',
  });

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

  // Replace the complex scrolling effect with a simple one that just clears selection
  useEffect(() => {
    // Track whether user is manually scrolling
    const manualScrollingRef = { current: false };

    // Function to handle manual scrolling events - Just clear selection
    const handleUserScroll = () => {
      // Only clear selection if there's no selected cell
      if (!selectedCell) {
        setSelectedCell(null);
      }
    };

    // Apply to the grid if it exists
    if (gridRef.current && gridRef.current._outerRef) {
      const gridElement = gridRef.current._outerRef;

      // Add scroll event handlers
      gridElement.addEventListener('wheel', handleUserScroll, { passive: true });
      gridElement.addEventListener('touchmove', handleUserScroll, { passive: true });
      gridElement.addEventListener('scroll', handleUserScroll, { passive: true });
    }

    return () => {
      // Clean up event listeners
      if (gridRef.current && gridRef.current._outerRef) {
        const gridElement = gridRef.current._outerRef;
        gridElement.removeEventListener('wheel', handleUserScroll);
        gridElement.removeEventListener('touchmove', handleUserScroll);
        gridElement.removeEventListener('scroll', handleUserScroll);
      }
    };
  }, [selectedCell]);

  // Update keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do nothing if context menu is open
      if (contextMenuColumn) return;

      // Stop handling if an input element has focus
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement
      ) {
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
            const inputEl = document.querySelector(
              `.grid-cell[data-cell="${selectedCell.rowId}-${selectedCell.columnId}"] input`
            ) as HTMLInputElement | null;

            if (inputEl) {
              inputEl.value = e.key;
              // Set cursor position after the typed character
              inputEl.selectionStart = 1;
              inputEl.selectionEnd = 1;
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
          newRowIndex = Math.max(0, rowIndex - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          newRowIndex = Math.min(data.length - 1, rowIndex + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          newColumnIndex = Math.max(0, columnIndex - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
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
            if (column?.editable) {
              setEditingCell({ rowId: selectedCell.rowId, columnId: selectedCell.columnId });
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

          // Calculate the scroll position for the new column
          if (gridRef.current) {
            // Calculate the total width up to the selected column
            let totalWidth = 0;
            for (let i = 0; i < newColumnIndex; i++) {
              totalWidth += columnWidths[i] || 180;
            }

            // Get the current scroll position and container width
            const currentScroll = gridRef.current._outerRef.scrollLeft;
            const containerWidth = gridRef.current._outerRef.clientWidth;

            // Calculate the target scroll position
            let targetScroll = currentScroll;

            // If the cell is to the right of the visible area
            if (totalWidth + (columnWidths[newColumnIndex] || 180) > currentScroll + containerWidth) {
              targetScroll = totalWidth + (columnWidths[newColumnIndex] || 180) - containerWidth;
            }
            // If the cell is to the left of the visible area
            else if (totalWidth < currentScroll) {
              targetScroll = totalWidth;
            }

            // Use react-window's scrollTo method
            if (targetScroll !== currentScroll) {
              gridRef.current.scrollTo({
                scrollLeft: targetScroll,
                scrollTop: gridRef.current._outerRef.scrollTop,
                behavior: 'smooth'
              });
            }
          }

          // Focus without scrolling 
          setTimeout(() => {
            if (mainViewRef.current) {
              try {
                mainViewRef.current.focus({ preventScroll: true });
              } catch (e) {
                console.warn('Focus error:', e);
              }
            }
          }, 10);
        }
      }
    };

    // Add handler for keyboard navigation
    document.addEventListener('keydown', handleKeyDown);

    // Add click listener for the search input to handle focus management
    const setupSearchInputListeners = () => {
      const searchInputs = [
        document.querySelector('input[placeholder="Search in grid..."]'),
        document.querySelector('.search-input'),
        document.querySelector('input[type="search"]'),
        document.querySelector('input[placeholder*="Search"]')
      ].filter(Boolean);

      searchInputs.forEach(input => {
        if (input instanceof HTMLInputElement) {
          // When search input is clicked, clear cell selection to prevent keyboard nav interference
          input.addEventListener('click', () => {
            setSelectedCell(null);
          });

          // Handle focus to properly manage keyboard events
          input.addEventListener('focus', () => {
            setSelectedCell(null);
          });
        }
      });
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
      // Clear any existing selection first to prevent highlighting issues
      setSelectedCell(null);

      // Small delay before setting new selection and entering edit mode
      setTimeout(() => {
        setSelectedCell({ rowId, columnId });
        setEditingCell({ rowId, columnId });
      }, 10);
      return;
    }

    // Check if clicking on a cell that's already selected
    const isClickingSameSelectedCell = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId;

    // For regular cell selection
    if (!isClickingSameSelectedCell) {
      // First clear selection
      setSelectedCell(null);

      // Then set the new selection after a short delay
      setTimeout(() => {
        setSelectedCell({ rowId, columnId });
      }, 10);
    } else if (column?.editable) {
      // Double click behavior - entering edit mode on second click
      setEditingCell({ rowId, columnId });
    }
  };

  // Critical fix: For Tab navigation to keep toolbar visible while maintaining proper selection and focus
  const handleTabNavigation = (e: React.KeyboardEvent, rowId: string, columnId: string, value: any) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent the event from bubbling up

    // Get current position
    const rowIndex = data.findIndex(row => row.id === rowId);
    const columnIndex = columns.findIndex(col => col.id === columnId);

    // Apply optimistic update immediately
    const cellKey = `${rowId}-${columnId}`;
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

      // IMPORTANT: Only focus, NO scrolling
      // Let the user manually scroll if needed
      setTimeout(() => {
        if (mainViewRef.current) {
          try {
            // Critical: use preventScroll to avoid layout shifts
            mainViewRef.current.focus({ preventScroll: true });
          } catch (e) {
            console.warn('Focus error:', e);
          }
        }
      }, 10);
    }
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

      // Apply optimistic update immediately
      const cellKey = `${rowId}-${columnId}`;
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

        // IMPORTANT: We ONLY update the selection, with NO scrolling
        // Let the user manually scroll down if needed

        // Simple focus - important to use preventScroll: true
        setTimeout(() => {
          if (mainViewRef.current) {
            try {
              mainViewRef.current.focus({ preventScroll: true });
            } catch (e) {
              console.warn('Focus error:', e);
            }
          }
        }, 10);
      }
    } else if (e.key === 'Escape') {
      // Cancel editing without saving
      e.preventDefault();
      e.stopPropagation();
      setEditingCell(null);
      setSelectedCell({ rowId, columnId });

      // Simple focus handler - with preventScroll: true
      setTimeout(() => {
        if (mainViewRef.current) {
          try {
            mainViewRef.current.focus({ preventScroll: true });
          } catch (e) {
            console.warn('Focus error', e);
          }
        }
      }, 10);
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

    // Reset focus to the main grid - with preventScroll: true to avoid toolbar issues
    if (mainViewRef.current) {
      setTimeout(() => {
        try {
          mainViewRef.current?.focus({ preventScroll: true });
        } catch (e) {
          console.warn('Focus error:', e);
        }
      }, 10);
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

      const newOrder = [...columns.map(col => col.id)];
      newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, sourceColumnId);

      onColumnsReorder(newOrder);
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

  // Calculate total grid width
  const totalWidth = columnWidths.reduce((sum, width) => {
    // Ensure we only add valid numbers
    const validWidth = typeof width === 'number' && !isNaN(width) ? width : 180;
    return sum + validWidth;
  }, 0);

  // Common blur handler to detect clicks on other cells
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, rowId: string, columnId: string, value: any) => {
    // Short delay to allow click events to complete first
    setTimeout(() => {
      // If we're still editing this cell after the timeout, it means
      // we didn't click on another cell and can safely complete the edit
      if (editingCell?.rowId === rowId && editingCell?.columnId === columnId) {
        // Save the edit without moving selection
        finishCellEdit(rowId, columnId, value);
      }
    }, 100);
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
    const row = data[rowIndex];
    if (!row) return null;
    const column = columns[columnIndex];
    if (!column) return null;
    const cellId = `${row.id}-${column.id}`;
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
    const isSelected = selectedCell?.rowId === row.id && selectedCell?.columnId === column.id;
    const value = row[column.id];
    return (
      <GridCell
        row={row}
        column={column}
        value={value}
        isEditing={isEditing}
        isSelected={isSelected}
        cellId={cellId}
        contextMenuColumn={contextMenuColumn}
        onCellClick={handleCellClick}
        onCellDoubleClick={undefined}
        onContextMenu={onContextMenu}
        onCellChange={onCellChange}
        onStartEdit={undefined}
        onFinishEdit={undefined}
        editingCell={editingCell}
        setEditingCell={setEditingCell}
        optimisticValue={optimisticUpdates[cellId]}
        style={style}
      />
    );
  };

  // Context menu actions
  const handleCopyColumn = (columnId: string) => {
    console.log(`Copy column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handlePasteColumn = (columnId: string) => {
    console.log(`Paste into column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleInsertLeft = (columnIndex: number) => {
    console.log(`Insert column left of index: ${columnIndex}`);
    
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
    console.log(`Insert column right of index: ${columnIndex}`);
    
    // Calculate the global column index by finding the column ID in the full columns array
    const columnId = columns[columnIndex]?.id;
    const globalIndex = allColumns ? allColumns.findIndex(col => col.id === columnId) : columnIndex;
    
    // Don't allow adding columns after lastContacted
    const column = columns[columnIndex];
    if (column?.id === 'lastContacted') {
      console.log("Cannot add columns after lastContacted");
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

  // Define default columns that cannot be deleted
  const defaultColumnIds = [
    'name', 'status', 'description', 'company', 'jobTitle', 'industry', 
    'phone', 'primaryLocation', 'email', 'facebook', 'instagram', 'linkedin', 
    'twitter', 'associatedDeals', 'revenue', 'closeDate', 'owner', 'source', 
    'lastContacted', 'website'
  ];

  const handleDeleteColumn = (columnId: string) => {
    console.log(`Delete column: ${columnId}`);
    
    // Check if it's a default column
    if (defaultColumnIds.includes(columnId)) {
      const column = columns.find(col => col.id === columnId) || 
                    allColumns?.find(col => col.id === columnId);
      
      setCannotDeleteModalState({
        isOpen: true,
        columnId,
        columnName: column?.title || columnId,
      });
    } else {
      // It's a user-added column, allow deletion
      if (onDeleteColumn) onDeleteColumn(columnId);
    }
    
    if (onContextMenu) onContextMenu(null);
  };

  const handleHideColumn = () => {
    if (onHideColumn && cannotDeleteModalState.columnId) {
      onHideColumn(cannotDeleteModalState.columnId);
    }
    setCannotDeleteModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCannotDeleteModalCancel = () => {
    setCannotDeleteModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleSortAZ = (columnId: string) => {
    console.log(`Sort sheet A-Z by column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleSortZA = (columnId: string) => {
    console.log(`Sort sheet Z-A by column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

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
              <span style={{ flex: 1 }}>{column.title}</span>
              <span
                className={`pin-icon ml-2 ${frozenColumnIds.includes(column.id) ? 'text-[#62BFAA]' : 'text-gray-400'} group-hover:opacity-100 opacity-0`}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                onClick={e => { e.stopPropagation(); onTogglePin(column.id); }}
              >
                {frozenColumnIds.includes(column.id) ? (
                  <PinOff size={16} />
                ) : (
                  <Pin size={16} />
                )}
              </span>
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

      {/* Cannot Delete Column Modal */}
      <CannotDeleteColumnModal
        isOpen={cannotDeleteModalState.isOpen}
        columnName={cannotDeleteModalState.columnName}
        onHideColumn={handleHideColumn}
        onCancel={handleCannotDeleteModalCancel}
      />
    </div>
  );
} 