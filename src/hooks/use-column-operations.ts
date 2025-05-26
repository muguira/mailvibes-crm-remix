import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Types - we'll need to align these with your existing types
export interface Column {
  id: string;
  title: string;
  type?: string;
  width?: number;
  editable?: boolean;
  hidden?: boolean;
  frozen?: boolean;
  originalIndex?: number; // Add this to track original position when hidden
  options?: string[];
  colors?: Record<string, string>;
  [key: string]: any;
}

export interface GridRow {
  id: string;
  [key: string]: any;
}

interface UseColumnOperationsProps {
  columns: Column[];
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
  data?: GridRow[];
  setData?: React.Dispatch<React.SetStateAction<GridRow[]>>;
  onPersist?: (columns: Column[]) => void;
  saveStateToHistory?: () => void;
  protectedColumns?: string[]; // Columns that can't be deleted/renamed
  onActivityLog?: (action: string, details: any) => void;
}

interface ColumnOperations {
  renameColumn: (columnId: string, newName: string) => void;
  deleteColumn: (columnId: string) => boolean;
  duplicateColumn: (column: Column) => Column | null;
  sortColumn: (columnId: string, direction: 'asc' | 'desc') => void;
  moveColumn: (columnId: string, direction: 'left' | 'right') => boolean;
  moveColumnToIndex: (columnId: string, targetIndex: number) => void;
  addColumn: (afterColumnId: string, columnData?: Partial<Column>) => Column;
  hideColumn: (columnId: string) => void;
  unhideColumn: (columnId: string) => void;
  reorderColumns: (columnIds: string[]) => void;
  updateColumnWidth: (columnId: string, width: number) => void;
}

export function useColumnOperations({
  columns,
  setColumns,
  data,
  setData,
  onPersist,
  saveStateToHistory,
  protectedColumns = ['name', 'status', 'company'], // Default protected columns
  onActivityLog
}: UseColumnOperationsProps): ColumnOperations {
  
  // Helper to check if a column is protected
  const isProtected = useCallback((columnId: string) => {
    return protectedColumns.includes(columnId);
  }, [protectedColumns]);

  // Helper to find column index
  const getColumnIndex = useCallback((columnId: string) => {
    return columns.findIndex(col => col.id === columnId);
  }, [columns]);

  // Rename column
  const renameColumn = useCallback((columnId: string, newName: string) => {
    if (isProtected(columnId)) {
      console.warn(`Cannot rename protected column: ${columnId}`);
      return;
    }

    if (!newName.trim()) {
      console.warn('Column name cannot be empty');
      return;
    }

    saveStateToHistory?.();
    
    setColumns(prev => {
      const updated = prev.map(col =>
        col.id === columnId ? { ...col, title: newName.trim() } : col
      );
      onPersist?.(updated);
      return updated;
    });

    onActivityLog?.('column_rename', { columnId, oldName: columns.find(c => c.id === columnId)?.title, newName });
  }, [setColumns, onPersist, saveStateToHistory, isProtected, columns, onActivityLog]);

  // Delete column
  const deleteColumn = useCallback((columnId: string): boolean => {
    if (isProtected(columnId)) {
      console.warn(`Cannot delete protected column: ${columnId}`);
      return false;
    }

    saveStateToHistory?.();

    const column = columns.find(col => col.id === columnId);
    
    setColumns(prev => {
      const updated = prev.filter(col => col.id !== columnId);
      onPersist?.(updated);
      return updated;
    });

    // Remove column data from all rows
    if (setData) {
      setData(prev => prev.map(row => {
        const { [columnId]: _, ...rest } = row;
        return rest;
      }));
    }

    onActivityLog?.('column_delete', { columnId, columnName: column?.title });
    return true;
  }, [setColumns, setData, onPersist, saveStateToHistory, isProtected, columns, onActivityLog]);

  // Duplicate column
  const duplicateColumn = useCallback((column: Column): Column | null => {
    saveStateToHistory?.();

    const baseKey = column.id.replace(/_copy\d*$/, '');
    const existingCopies = columns.filter(col => 
      col.id.startsWith(baseKey + '_copy')
    ).length;
    
    const newId = existingCopies > 0 
      ? `${baseKey}_copy${existingCopies + 1}`
      : `${baseKey}_copy`;
    
    const newColumn: Column = {
      ...column,
      id: newId,
      title: `${column.title} Copy${existingCopies > 0 ? ` ${existingCopies + 1}` : ''}`,
      frozen: false // Duplicated columns should not be frozen by default
    };

    setColumns(prev => {
      const columnIndex = prev.findIndex(col => col.id === column.id);
      const updated = [...prev];
      updated.splice(columnIndex + 1, 0, newColumn);
      onPersist?.(updated);
      return updated;
    });

    // Copy column data to the new column
    if (setData) {
      setData(prev => prev.map(row => ({
        ...row,
        [newId]: row[column.id]
      })));
    }

    onActivityLog?.('column_duplicate', { sourceColumnId: column.id, newColumnId: newId, columnName: column.title });
    return newColumn;
  }, [setColumns, setData, onPersist, saveStateToHistory, columns, onActivityLog]);

  // Sort column
  const sortColumn = useCallback((columnId: string, direction: 'asc' | 'desc') => {
    if (!data || !setData) {
      console.warn('Cannot sort: data or setData not provided');
      return;
    }

    saveStateToHistory?.();

    setData(prev => {
      const sorted = [...prev].sort((a, b) => {
        const valueA = a[columnId];
        const valueB = b[columnId];

        // Handle null/undefined values
        if (valueA == null && valueB == null) return 0;
        if (valueA == null) return direction === 'asc' ? 1 : -1;
        if (valueB == null) return direction === 'asc' ? -1 : 1;

        // Compare values
        if (typeof valueA === 'string' && typeof valueB === 'string') {
          const comparison = valueA.toLowerCase().localeCompare(valueB.toLowerCase());
          return direction === 'asc' ? comparison : -comparison;
        }

        if (valueA === valueB) return 0;
        
        if (direction === 'asc') {
          return valueA < valueB ? -1 : 1;
        } else {
          return valueA > valueB ? -1 : 1;
        }
      });
      return sorted;
    });

    onActivityLog?.('column_sort', { columnId, direction, columnName: columns.find(c => c.id === columnId)?.title });
  }, [setData, data, saveStateToHistory, columns, onActivityLog]);

  // Move column left/right
  const moveColumn = useCallback((columnId: string, direction: 'left' | 'right'): boolean => {
    const columnIndex = getColumnIndex(columnId);
    if (columnIndex === -1) return false;

    const newIndex = direction === 'left' ? columnIndex - 1 : columnIndex + 1;
    if (newIndex < 0 || newIndex >= columns.length) return false;

    saveStateToHistory?.();

    setColumns(prev => {
      const updated = [...prev];
      const [movedColumn] = updated.splice(columnIndex, 1);
      updated.splice(newIndex, 0, movedColumn);
      onPersist?.(updated);
      return updated;
    });

    onActivityLog?.('column_move', { columnId, direction, columnName: columns.find(c => c.id === columnId)?.title });
    return true;
  }, [setColumns, getColumnIndex, columns, onPersist, saveStateToHistory, onActivityLog]);

  // Move column to specific index
  const moveColumnToIndex = useCallback((columnId: string, targetIndex: number) => {
    const currentIndex = getColumnIndex(columnId);
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= columns.length) return;
    if (currentIndex === targetIndex) return;

    saveStateToHistory?.();

    setColumns(prev => {
      const updated = [...prev];
      const [movedColumn] = updated.splice(currentIndex, 1);
      updated.splice(targetIndex, 0, movedColumn);
      onPersist?.(updated);
      return updated;
    });

    onActivityLog?.('column_reorder', { columnId, fromIndex: currentIndex, toIndex: targetIndex });
  }, [setColumns, getColumnIndex, columns, onPersist, saveStateToHistory, onActivityLog]);

  // Add new column
  const addColumn = useCallback((afterColumnId: string, columnData?: Partial<Column>): Column => {
    const columnId = columnData?.id || `column-${uuidv4().substring(0, 8)}`;
    
    const newColumn: Column = {
      id: columnId,
      title: 'New Column',
      type: 'text',
      width: 200,
      editable: true,
      ...columnData
    };

    const afterIndex = getColumnIndex(afterColumnId);
    
    saveStateToHistory?.();

    setColumns(prev => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, newColumn);
      onPersist?.(updated);
      return updated;
    });

    onActivityLog?.('column_add', { columnId: newColumn.id, columnName: newColumn.title, afterColumnId });
    return newColumn;
  }, [setColumns, getColumnIndex, onPersist, saveStateToHistory, onActivityLog]);

  // Hide column (sets a hidden property)
  const hideColumn = useCallback((columnId: string) => {
    saveStateToHistory?.();
    
    const columnIndex = getColumnIndex(columnId);
    
    setColumns(prev => {
      const updated = prev.map((col, index) =>
        col.id === columnId ? { ...col, hidden: true, originalIndex: columnIndex } : col
      );
      onPersist?.(updated);
      return updated;
    });

    onActivityLog?.('column_hide', { columnId, columnName: columns.find(c => c.id === columnId)?.title });
  }, [setColumns, onPersist, saveStateToHistory, columns, onActivityLog, getColumnIndex]);

  // Unhide column
  const unhideColumn = useCallback((columnId: string) => {
    saveStateToHistory?.();
    
    setColumns(prev => {
      const column = prev.find(col => col.id === columnId);
      if (!column) return prev;
      
      // Get the original index from the column
      const originalIndex = column.originalIndex;
      
      // If we have an original index, restore the column to that position
      if (originalIndex !== undefined && originalIndex >= 0) {
        // Create updated columns array
        const visibleColumns = prev.filter(col => !col.hidden);
        const hiddenColumns = prev.filter(col => col.hidden && col.id !== columnId);
        
        // Count how many columns that should come before this one are currently visible
        let insertPosition = 0;
        for (let i = 0; i < originalIndex && i < prev.length; i++) {
          if (!prev[i].hidden) {
            insertPosition++;
          }
        }
        
        // Create the unhidden column without the hidden flag and originalIndex
        const { hidden, originalIndex: _, ...unhiddenColumn } = column;
        
        // Insert at the calculated position
        const result = [...visibleColumns];
        result.splice(insertPosition, 0, unhiddenColumn);
        
        // Combine with remaining hidden columns
        const final = [...result, ...hiddenColumns];
        onPersist?.(final);
        return final;
      } else {
        // Fallback to just removing the hidden flag
        const updated = prev.map(col =>
          col.id === columnId ? { ...col, hidden: false } : col
        );
        onPersist?.(updated);
        return updated;
      }
    });

    onActivityLog?.('column_unhide', { columnId, columnName: columns.find(c => c.id === columnId)?.title });
  }, [setColumns, onPersist, saveStateToHistory, columns, onActivityLog]);

  // Reorder multiple columns
  const reorderColumns = useCallback((columnIds: string[]) => {
    saveStateToHistory?.();

    setColumns(prev => {
      const updated = columnIds
        .map(id => prev.find(col => col.id === id))
        .filter(Boolean) as Column[];
      
      // Add any columns that weren't in the columnIds array (shouldn't happen, but safety check)
      const missingColumns = prev.filter(col => !columnIds.includes(col.id));
      const final = [...updated, ...missingColumns];
      
      onPersist?.(final);
      return final;
    });

    onActivityLog?.('columns_reorder', { columnIds });
  }, [setColumns, onPersist, saveStateToHistory, onActivityLog]);

  // Update column width
  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    if (width < 50) return; // Minimum width constraint

    setColumns(prev => {
      const updated = prev.map(col =>
        col.id === columnId ? { ...col, width } : col
      );
      onPersist?.(updated);
      return updated;
    });
  }, [setColumns, onPersist]);

  return {
    renameColumn,
    deleteColumn,
    duplicateColumn,
    sortColumn,
    moveColumn,
    moveColumnToIndex,
    addColumn,
    hideColumn,
    unhideColumn,
    reorderColumns,
    updateColumnWidth
  };
} 