import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { Column, GridRow } from './types';
import { ROW_HEIGHT, HEADER_HEIGHT } from './grid-constants';
import { ContextMenu } from './ContextMenu';
import { Check, CalendarIcon, X } from 'lucide-react';
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
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface MainGridViewProps {
  columns: Column[];
  data: GridRow[];
  scrollTop: number;
  scrollLeft: number;
  containerWidth: number;
  containerHeight: number;
  onScroll: (scrollInfo: { scrollTop: number, scrollLeft: number }) => void;
  onCellChange?: (rowId: string, columnId: string, value: any) => void;
  onColumnChange?: (columnId: string, updates: Partial<Column>) => void;
  onColumnsReorder?: (columnIds: string[]) => void;
  onAddColumn?: (afterColumnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onContextMenu?: (columnId: string | null, position?: { x: number, y: number }) => void;
  contextMenuColumn?: string | null;
  contextMenuPosition?: { x: number, y: number } | null;
}

export function MainGridView({
  columns,
  data,
  scrollTop,
  scrollLeft,
  containerWidth,
  containerHeight,
  onScroll,
  onCellChange,
  onColumnChange,
  onColumnsReorder,
  onAddColumn,
  onDeleteColumn,
  onContextMenu,
  contextMenuColumn,
  contextMenuPosition
}: MainGridViewProps) {
  const gridRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{
    rowId: string,
    columnId: string,
    directTyping?: boolean,
    clearDateSelection?: boolean
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string, columnId: string } | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>(columns.map(col => col.width));

  // Add optimistic updates state to immediately show changes locally
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});

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
      // Clear cell selection when user manually scrolls
      setSelectedCell(null);
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
  }, []);

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
          // Only update selection - disable auto-scrolling entirely
          setSelectedCell({ rowId: newRowId, columnId: newColumnId });

          // Focus without scrolling 
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
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
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

    // Special handler for status column - only open on double click
    if (column.id === 'status') {
      return (
        <div
          style={{
            ...style,
            height: ROW_HEIGHT,
            border: '2px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
            borderRight: '1px solid #e5e7eb',
            boxSizing: 'border-box',
            width: column.width,
            display: 'flex',
            justifyContent: 'center', // Keep pill centered
            alignItems: 'center'
          }}
          className={`grid-cell ${column.id === contextMenuColumn ? 'highlight-column' : ''} ${isSelected ? 'selected-cell' : ''}`}
          data-cell={cellId}
          data-column-id={column.id}
          onClick={(e) => handleCellClick(row.id, column.id, e)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Enter edit mode on double-click
            if (column?.editable) {
              setEditingCell({ rowId: row.id, columnId: column.id });
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onContextMenu) {
              onContextMenu(column.id, { x: e.clientX, y: e.clientY });
            }
          }}
        >
          {isEditing ? (
            <div className="w-full h-full flex justify-center items-center">
              <Popover open={true}>
                <PopoverTrigger asChild>
                  <div className="cursor-pointer flex justify-center items-center">
                    {renderStatusPill(value, column.colors)}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="status-options-popup"
                  align="start"
                  side="bottom"
                  alignOffset={-50}
                  sideOffset={5}
                >
                  <div className="status-popup-header">
                    <span>Select Status</span>
                    <button
                      className="status-popup-close"
                      onClick={() => setEditingCell(null)}
                      aria-label="Close status popup"
                    >
                      ✕
                    </button>
                  </div>
                  <Command className="status-command">
                    <CommandList>
                      <CommandGroup>
                        {(column.options || []).map(option => {
                          // Use the same custom colors definition for consistency
                          const customColors: Record<string, { bg: string, text: string }> = {
                            'New': { bg: 'rgba(250, 237, 203, 0.7)', text: '#000000' },          // Light Cream
                            'In Progress': { bg: 'rgba(201, 228, 222, 0.7)', text: '#000000' },  // Light Mint
                            'On Hold': { bg: 'rgba(198, 222, 241, 0.7)', text: '#000000' },      // Light Blue
                            'Closed Won': { bg: 'rgba(219, 205, 240, 0.7)', text: '#000000' },   // Light Lavender
                            'Closed Lost': { bg: 'rgba(242, 198, 222, 0.7)', text: '#000000' }   // Light Pink
                          };

                          const customColor = customColors[option];
                          const bgColor = customColor?.bg || column.colors?.[option] || 'rgba(247, 217, 196, 0.7)'; // Fallback to Light Peach

                          return (
                            <CommandItem
                              key={option}
                              value={option}
                              onSelect={() => {
                                finishCellEdit(row.id, column.id, option);
                              }}
                              className="status-command-item"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <span
                                  className="inline-block w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: option === 'New' ? '#FAEDCB' :
                                      option === 'In Progress' ? '#C9E4DE' :
                                        option === 'On Hold' ? '#C6DEF1' :
                                          option === 'Closed Won' ? '#DBCDF0' :
                                            option === 'Closed Lost' ? '#F2C6DE' : '#F7D9C4'
                                  }}
                                />
                                <span>{option}</span>
                                {value === option && (
                                  <Check className="ml-auto h-4 w-4" />
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <div className="flex justify-center items-center">
              {renderStatusPill(value, column.colors)}
            </div>
          )}
        </div>
      );
    }

    // Special handler for date columns
    if (column.type === 'date') {
      return (
        <div
          style={{
            ...style,
            height: ROW_HEIGHT,
            border: '2px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
            borderRight: '1px solid #e5e7eb',
            boxSizing: 'border-box',
            width: column.width
          }}
          className={`grid-cell ${column.id === contextMenuColumn ? 'highlight-column' : ''} ${isSelected ? 'selected-cell' : ''}`}
          data-cell={cellId}
          data-column-id={column.id}
          onClick={(e) => handleCellClick(row.id, column.id, e)}
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Enter edit mode on double-click with calendar
            if (column?.editable) {
              // Start editing with a clear calendar flag
              setEditingCell({
                rowId: row.id,
                columnId: column.id,
                clearDateSelection: true // Add flag to clear date selection
              });
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onContextMenu) {
              onContextMenu(column.id, { x: e.clientX, y: e.clientY });
            }
          }}
        >
          {isEditing ? (
            // Only show the calendar if we're not in direct typing mode
            editingCell?.directTyping ? (
              renderEditInput(row, column)
            ) : (
              <div className="w-full h-full flex justify-center items-center">
                {/* Create a completely stateless calendar that doesn't maintain its own selected date */}
                <Popover open={true} modal={true}>
                  <PopoverTrigger asChild>
                    <div className="cursor-pointer flex justify-center items-center">
                      {formatCellValue(value, column, row)}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="date-options-popup p-0"
                    align="start"
                    side="bottom"
                    alignOffset={-50}
                    sideOffset={5}
                  >
                    <div className="date-popup-header p-3 border-b flex justify-between items-center border-2">
                      <span className="text-sm font-medium">Select Date</span>
                      <button
                        className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center"
                        onClick={() => setEditingCell(null)}
                        aria-label="Close date popup"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="p-5">
                      <Calendar
                        mode="single"
                        // If clearDateSelection flag is true, don't pass any selected date
                        selected={editingCell?.clearDateSelection ? undefined : (value ? new Date(value) : undefined)}
                        onSelect={(date) => {
                          if (date) {
                            const formattedDate = format(date, 'yyyy-MM-dd'); // Store in ISO format for data consistency
                            // Immediately close the popup and apply the change
                            setEditingCell(null);
                            finishCellEdit(row.id, column.id, formattedDate);
                          } else {
                            setEditingCell(null);
                            finishCellEdit(row.id, column.id, '');
                          }
                        }}
                        defaultMonth={value ? new Date(value) : new Date()}
                        initialFocus
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )
          ) : (
            <div className="cell-content">
              {formatCellValue(value, column, row)}
            </div>
          )}
        </div>
      );
    }

    // Regular cell rendering (non-status, non-date)
    return (
      <div
        style={{
          ...style,
          border: '2px solid #e5e7eb',
          height: ROW_HEIGHT,
          boxSizing: 'border-box',
          width: column.width // Ensure same width as header
        }}
        className={`grid-cell ${column.id === contextMenuColumn ? 'highlight-column' : ''} ${isSelected ? 'selected-cell' : ''}`}
        data-cell={cellId}
        data-column-id={column.id}
        onClick={(e) => handleCellClick(row.id, column.id, e)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          // For double-clicking on any editable cell
          if (column?.editable) {
            // Always enter edit mode on double-click for editable cells
            setEditingCell({ rowId: row.id, columnId: column.id });
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onContextMenu) {
            onContextMenu(column.id, { x: e.clientX, y: e.clientY });
          }
        }}
      >
        {isEditing ? (
          renderEditInput(row, column)
        ) : (
          <div className="cell-content">
            {formatCellValue(value, column, row)}
          </div>
        )}
      </div>
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

  const handleInsertLeft = (columnId: string) => {
    console.log(`Insert column left of: ${columnId}`);
    const columnIndex = columns.findIndex(col => col.id === columnId);
    if (columnIndex > 0) {
      const prevColumnId = columns[columnIndex - 1].id;
      if (onAddColumn) {
        onAddColumn(prevColumnId);
      }
    }
    if (onContextMenu) onContextMenu(null);
  };

  const handleInsertRight = (columnId: string) => {
    console.log(`Insert column right of: ${columnId}`);

    // Don't allow adding columns after lastContacted
    if (columnId === 'lastContacted') {
      console.log("Cannot add columns after lastContacted");
      // No alert message
      if (onContextMenu) onContextMenu(null);
      return;
    }

    // We're modifying this logic - allow adding after any column except lastContacted
    if (onAddColumn) {
      onAddColumn(columnId);
    }
    if (onContextMenu) onContextMenu(null);
  };

  const handleDeleteColumn = (columnId: string) => {
    console.log(`Delete column: ${columnId}`);
    if (onDeleteColumn) onDeleteColumn(columnId);
    if (onContextMenu) onContextMenu(null);
  };

  const handleSortAZ = (columnId: string) => {
    console.log(`Sort sheet A-Z by column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  const handleSortZA = (columnId: string) => {
    console.log(`Sort sheet Z-A by column: ${columnId}`);
    if (onContextMenu) onContextMenu(null);
  };

  // Update the renderEditInput function to use the new handleInputBlur
  const renderEditInput = (row: GridRow, column: Column) => {
    const value = row[column.id];

    // Common focus handler to select all text when input is focused
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all text when input receives focus
      setTimeout(() => e.target.select(), 0);
    };

    switch (column.type) {
      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            className="grid-cell-input"
            defaultValue={value as number}
            autoFocus
            onFocus={handleInputFocus}
            onBlur={(e) => handleInputBlur(e, row.id, column.id, e.target.value)}
            onKeyDown={(e) => handleEditingKeyDown(e, row.id, column.id, e.currentTarget.value)}
          />
        );
      case 'date':
        // Don't check for popups here anymore, we're using the directTyping flag
        // Parse the existing date if available
        let displayValue = value as string;
        try {
          if (displayValue) {
            const date = new Date(displayValue);
            if (!isNaN(date.getTime())) {
              // Format for display in the input as MM-DD-YYYY
              displayValue = format(date, 'MM-dd-yyyy');
            }
          }
        } catch (e) {
          // Use original value if parsing fails
        }

        return (
          <input
            type="text"
            className="grid-cell-input"
            placeholder="MM-DD-YYYY"
            defaultValue={displayValue}
            autoFocus
            onFocus={handleInputFocus}
            // Add input masking for date format
            onKeyDown={(e) => {
              // Allow: numbers, backspace, delete, tab, arrows, home, end
              const allowedKeys = [
                'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
                'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                'Home', 'End'
              ];

              if (allowedKeys.includes(e.key)) {
                // Pass through keyboard navigation keys
                handleEditingKeyDown(e, row.id, column.id, e.currentTarget.value);
                return;
              }

              // Allow numbers
              if (e.key >= '0' && e.key <= '9') {
                const input = e.currentTarget;
                const selectionStart = input.selectionStart || 0;
                const currentValue = input.value;

                // For MM part, only allow 01-12
                if (selectionStart === 0) {
                  // First digit of month can only be 0 or 1
                  if (!(e.key === '0' || e.key === '1')) {
                    e.preventDefault();
                    return;
                  }
                } else if (selectionStart === 1) {
                  // Second digit of month depends on first digit
                  const firstDigit = currentValue.charAt(0);
                  if (firstDigit === '0') {
                    // If first digit is 0, second can be 1-9
                    if (e.key === '0') {
                      e.preventDefault();
                      return;
                    }
                  } else if (firstDigit === '1') {
                    // If first digit is 1, second can only be 0-2
                    if (!(e.key === '0' || e.key === '1' || e.key === '2')) {
                      e.preventDefault();
                      return;
                    }
                  }
                }
                // For DD part, only allow 01-31
                else if (selectionStart === 3) {
                  // First digit of day can only be 0-3
                  if (!(e.key === '0' || e.key === '1' || e.key === '2' || e.key === '3')) {
                    e.preventDefault();
                    return;
                  }
                } else if (selectionStart === 4) {
                  // Second digit of day depends on first digit
                  const firstDigit = currentValue.charAt(3);
                  if (firstDigit === '3') {
                    // If first digit is 3, second can only be 0-1
                    if (!(e.key === '0' || e.key === '1')) {
                      e.preventDefault();
                      return;
                    }
                  }
                }
                // For YYYY part, only allow 1900-2030
                else if (selectionStart >= 6 && selectionStart <= 9) {
                  // Handle year validation based on current input
                  const yearPart = currentValue.substring(6);
                  let willBeYear = yearPart;

                  // Calculate what the year would be after this keypress
                  if (selectionStart < yearPart.length) {
                    // We're replacing a digit
                    willBeYear = yearPart.substring(0, selectionStart - 6) + e.key + yearPart.substring(selectionStart - 6 + 1);
                  } else {
                    // We're adding a digit
                    willBeYear = yearPart + e.key;
                  }

                  // For partial years, do some basic validation
                  if (willBeYear.length === 1) {
                    // First digit of year can only be 1 or 2
                    if (!(e.key === '1' || e.key === '2')) {
                      e.preventDefault();
                      return;
                    }
                  } else if (willBeYear.length === 2) {
                    // Check first two digits
                    if (willBeYear === '19' || willBeYear === '20') {
                      // 19xx or 20xx is acceptable
                    } else {
                      e.preventDefault();
                      return;
                    }
                  } else if (willBeYear.length === 3) {
                    // For 3 digits, ensure we're not going below 190x or above 203x
                    if (willBeYear.startsWith('19') || (willBeYear.startsWith('20') && willBeYear[2] <= '3')) {
                      // Valid prefix
                    } else {
                      e.preventDefault();
                      return;
                    }
                  } else if (willBeYear.length === 4) {
                    // Full year check
                    const fullYear = parseInt(willBeYear, 10);
                    if (fullYear < 1900 || fullYear > 2030) {
                      e.preventDefault();
                      return;
                    }
                  }
                }

                // Prevent input beyond 10 characters (MM-DD-YYYY format)
                if (currentValue.length >= 10 && selectionStart >= 10) {
                  e.preventDefault();
                  return;
                }

                // Auto-add separators
                if (currentValue.length === 2 && selectionStart === 2) {
                  input.value = currentValue + '-' + e.key;
                  input.selectionStart = 4;
                  input.selectionEnd = 4;
                  e.preventDefault();
                } else if (currentValue.length === 5 && selectionStart === 5) {
                  input.value = currentValue + '-' + e.key;
                  input.selectionStart = 7;
                  input.selectionEnd = 7;
                  e.preventDefault();
                }

                return;
              }

              // Allow separators, but only in correct positions
              if (e.key === '-' || e.key === '/') {
                const input = e.currentTarget;
                const selectionStart = input.selectionStart || 0;
                const currentValue = input.value;

                // Only allow separator at positions 2 and 5
                if (selectionStart === 2 || selectionStart === 5) {
                  // Replace slash with dash for consistency
                  if (e.key === '/') {
                    input.value = currentValue.slice(0, selectionStart) + '-' + currentValue.slice(selectionStart);
                    input.selectionStart = selectionStart + 1;
                    input.selectionEnd = selectionStart + 1;
                    e.preventDefault();
                  }
                  return;
                }
              }

              // Block all other keys
              e.preventDefault();
            }}
            onBlur={(e) => {
              // Parse the input value to a standard date format
              try {
                // Try to parse various date formats
                const inputVal = e.target.value;
                if (inputVal) {
                  // Check for MM-DD-YYYY or MM/DD/YYYY format
                  const dateMatch = inputVal.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
                  if (dateMatch) {
                    const month = parseInt(dateMatch[1], 10);
                    const day = parseInt(dateMatch[2], 10);
                    const year = parseInt(dateMatch[3], 10);

                    // Validate strict ranges
                    if (
                      month >= 1 && month <= 12 && // Month: 1-12
                      day >= 1 && day <= 31 &&     // Day: 1-31
                      year >= 1900 && year <= 2030 // Year: 1900-2030
                    ) {
                      // Additional validation for specific month/day combinations
                      // February cannot have more than 29 days (or 28 in non-leap years)
                      if (month === 2 && day > 29) {
                        showDateError(e.target, "February cannot have more than 29 days");
                        return;
                      }
                      // Check for leap year if February 29
                      if (month === 2 && day === 29 && !isLeapYear(year)) {
                        showDateError(e.target, `${year} is not a leap year`);
                        return;
                      }
                      // April, June, September, November cannot have more than 30 days
                      if ([4, 6, 9, 11].includes(month) && day > 30) {
                        showDateError(e.target, "This month cannot have more than 30 days");
                        return;
                      }

                      // If all validations pass, create the date object
                      const jsMonth = month - 1; // JavaScript months are 0-based
                      const date = new Date(year, jsMonth, day);

                      if (!isNaN(date.getTime())) {
                        // Store in ISO format for data consistency
                        handleInputBlur(e, row.id, column.id, format(date, 'yyyy-MM-dd'));
                        return;
                      }
                    } else {
                      // Show specific error message based on which value is invalid
                      if (month < 1 || month > 12) {
                        showDateError(e.target, "Month must be between 1-12");
                      } else if (day < 1 || day > 31) {
                        showDateError(e.target, "Day must be between 1-31");
                      } else if (year < 1900 || year > 2030) {
                        showDateError(e.target, "Year must be between 1900-2030");
                      } else {
                        showDateError(e.target, "Invalid date format");
                      }
                      return;
                    }
                  } else {
                    showDateError(e.target, "Use format MM-DD-YYYY");
                    return;
                  }
                }
                // Empty input is valid (clears the date)
                if (inputVal === '') {
                  handleInputBlur(e, row.id, column.id, '');
                  return;
                }
                // Show generic error for other cases
                showDateError(e.target, "Invalid date format");
              } catch (err) {
                // Just use the raw value if parsing fails
                showDateError(e.target, "Invalid date");
              }
            }}
          />
        );
      case 'status':
        return (
          <div className="w-full h-full">
            <Select
              defaultValue={value as string}
              onValueChange={(selectedValue) => {
                // Apply optimistic update and save
                finishCellEdit(row.id, column.id, selectedValue);
              }}
            >
              <SelectTrigger className="grid-cell-input status-select" autoFocus>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5} align="start" className="status-dropdown-content">
                {column.options?.map((option) => {
                  // Use the same custom colors definition for consistency
                  const customColors: Record<string, { bg: string, text: string }> = {
                    'New': { bg: 'rgba(250, 237, 203, 0.7)', text: '#000000' },          // Light Cream
                    'In Progress': { bg: 'rgba(201, 228, 222, 0.7)', text: '#000000' },  // Light Mint
                    'On Hold': { bg: 'rgba(198, 222, 241, 0.7)', text: '#000000' },      // Light Blue
                    'Closed Won': { bg: 'rgba(219, 205, 240, 0.7)', text: '#000000' },   // Light Lavender
                    'Closed Lost': { bg: 'rgba(242, 198, 222, 0.7)', text: '#000000' }   // Light Pink
                  };

                  const customColor = customColors[option];
                  const bgColor = customColor?.bg || column.colors?.[option] || 'rgba(247, 217, 196, 0.7)'; // Fallback to Light Peach
                  const textColor = customColor?.text || '#000000'; // Dark text for light backgrounds

                  return (
                    <SelectItem key={option} value={option}>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: option === 'New' ? '#FAEDCB' :
                              option === 'In Progress' ? '#C9E4DE' :
                                option === 'On Hold' ? '#C6DEF1' :
                                  option === 'Closed Won' ? '#DBCDF0' :
                                    option === 'Closed Lost' ? '#F2C6DE' : '#F7D9C4'
                          }}
                        />
                        {option}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        );
      default:
        return (
          <input
            type="text"
            className="grid-cell-input"
            defaultValue={value as string}
            autoFocus
            onFocus={handleInputFocus}
            onBlur={(e) => handleInputBlur(e, row.id, column.id, e.target.value)}
            onKeyDown={(e) => handleEditingKeyDown(e, row.id, column.id, e.currentTarget.value)}
          />
        );
    }
  };

  // Helper function to check if a year is a leap year
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  // Helper function to show date error message
  const showDateError = (input: HTMLInputElement, message: string) => {
    input.value = ''; // Clear the invalid value
    input.placeholder = message;
    input.classList.add('invalid-date');

    // Keep focus on the input
    setTimeout(() => {
      input.focus();
    }, 0);
  };

  return (
    <div
      className="main-grid-view"
      ref={mainViewRef}
      tabIndex={0} // Make the div focusable
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
        <div className="grid-header-row" style={{
          width: totalWidth,
          display: 'flex',
          boxSizing: 'border-box'
        }}>
          {columns.map((column, index) => (
            <div
              key={column.id}
              className={`grid-header-cell ${column.id === contextMenuColumn ? 'highlight-column' : ''}`}
              style={{
                width: column.width,
                boxSizing: 'border-box'
              }}
              draggable
              onDragStart={(e) => handleHeaderDragStart(e, column.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleHeaderDrop(e, column.id)}
              onContextMenu={(e) => handleHeaderContextMenu(e, column.id)}
            >
              {column.title}
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
          onClose={() => onContextMenu && onContextMenu(null)}
          onCopy={handleCopyColumn}
          onPaste={handlePasteColumn}
          onInsertLeft={handleInsertLeft}
          onInsertRight={handleInsertRight}
          onDelete={handleDeleteColumn}
          onSortAZ={handleSortAZ}
          onSortZA={handleSortZA}
          isVisible={!!contextMenuColumn}
        />
      )}
    </div>
  );
} 