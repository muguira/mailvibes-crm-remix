
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { GridToolbar } from "./grid-toolbar";
import { GridHeaders } from "./grid-headers";
import { GridRow } from "./grid-row";
import { GridDatePicker } from "./grid-date-picker";
import { GridSelectDropdown } from "./grid-select-dropdown";
import { isValidUrl } from "./grid-utils";

export type ColumnType = "text" | "number" | "date" | "status" | "currency" | "select" | "checkbox" | "url";

export interface ColumnDef {
  key: string;
  header: string;
  type: ColumnType;
  editable?: boolean;
  width?: number;
  options?: string[];
  colors?: Record<string, string>;
  frozen?: boolean; // For keeping columns like "Opportunity" fixed
}

interface RowData {
  id: string;
  [key: string]: any;
}

interface GridViewProps {
  columns: ColumnDef[];
  data: RowData[];
  listName: string;
  listType: string;
}

export function GridView({ columns: initialColumns, data: initialData, listName, listType }: GridViewProps) {
  // Container references for sync scrolling
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    // Set the Opportunity column as frozen and first
    return initialColumns.map(col => ({
      ...col,
      frozen: col.key === "opportunity"
    }));
  });
  
  const [data, setData] = useState<RowData[]>(initialData);
  const [activeCell, setActiveCell] = useState<{ row: string; col: string } | null>(null);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [newColumn, setNewColumn] = useState<{
    header: string;
    type: ColumnType;
    options?: string[];
  }>({
    header: "",
    type: "text"
  });
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState<{row: string, col: string} | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [calendarAnchor, setCalendarAnchor] = useState({ top: 0, left: 0 });
  const [activeDateCell, setActiveDateCell] = useState<{ row: string; col: string } | null>(null);
  const [selectDropdownOpen, setSelectDropdownOpen] = useState(false);
  const [activeSelectCell, setActiveSelectCell] = useState<{ row: string; col: string, options: string[] } | null>(null);
  
  // History stack for undo/redo functionality
  const [undoStack, setUndoStack] = useState<{columns: ColumnDef[], data: RowData[]}[]>([]);
  const [redoStack, setRedoStack] = useState<{columns: ColumnDef[], data: RowData[]}[]>([]);
  
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
  }, []);

  const handleCellClick = (rowId: string, colKey: string, colType: ColumnType, options?: string[]) => {
    // Don't open editor for checkbox type - toggle value directly
    if (colType === "checkbox") {
      toggleCheckbox(rowId, colKey);
      return;
    }
    
    // For URL type, open in new tab on single click if it's a valid URL
    if (colType === "url" && !activeCell) {
      const url = data.find(row => row.id === rowId)?.[colKey];
      if (url && isValidUrl(url)) {
        window.open(url, "_blank");
        return;
      }
    }
    
    // For date type, open the date picker
    if (colType === "date") {
      const cell = document.querySelector(`[data-cell="${rowId}-${colKey}"]`);
      if (cell) {
        const rect = cell.getBoundingClientRect();
        setCalendarAnchor({
          top: rect.top + rect.height,
          left: Math.max(rect.left, 10) // Ensure it's not off-screen
        });
        setActiveDateCell({ row: rowId, col: colKey });
        // Parse the current date value if it exists
        const currentValue = data.find(row => row.id === rowId)?.[colKey];
        if (currentValue) {
          try {
            const dateValue = new Date(currentValue);
            if (!isNaN(dateValue.getTime())) {
              setSelectedDate(dateValue);
            }
          } catch (e) {
            setSelectedDate(undefined);
          }
        } else {
          setSelectedDate(undefined);
        }
        setDatePickerOpen(true);
      }
      return;
    }
    
    // For select/status type, open the select dropdown
    if ((colType === "select" || colType === "status") && options && options.length) {
      const cell = document.querySelector(`[data-cell="${rowId}-${colKey}"]`);
      if (cell) {
        const rect = cell.getBoundingClientRect();
        setCalendarAnchor({
          top: rect.top + rect.height,
          left: Math.max(rect.left, 10) // Ensure it's not off-screen
        });
        setActiveSelectCell({ 
          row: rowId, 
          col: colKey, 
          options 
        });
        setSelectDropdownOpen(true);
      }
      return;
    }
    
    setActiveCell({ row: rowId, col: colKey });
  };
  
  const handleHeaderDoubleClick = (colKey: string) => {
    // Don't allow editing the opportunity column header
    if (colKey === "opportunity") return;
    
    const column = columns.find(col => col.key === colKey);
    if (column) {
      setEditingHeader(colKey);
    }
  };

  const toggleCheckbox = (rowId: string, colKey: string) => {
    // Save previous state for undo
    saveStateToHistory();
    
    // Toggle the checkbox value
    setData(prevData => prevData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          [colKey]: !row[colKey]
        };
      }
      return row;
    }));
    
    // Show save indicator
    setShowSaveIndicator({ row: rowId, col: colKey });
    setTimeout(() => setShowSaveIndicator(null), 500);
  };

  const handleCellChange = (rowId: string, colKey: string, value: any, type: ColumnType) => {
    // Save previous state for undo
    saveStateToHistory();
    
    // Format value based on type
    let formattedValue = value;
    
    if (type === "number") {
      formattedValue = isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    } else if (type === "currency") {
      // Remove currency symbol and format
      const numValue = value.replace(/[^0-9.-]+/g, "");
      formattedValue = isNaN(parseFloat(numValue)) ? 0 : `$${parseFloat(numValue).toLocaleString()}`;
    } else if (type === "url") {
      // Basic validation for URLs
      if (value && !isValidUrl(value)) {
        toast.warning("Please enter a valid URL with protocol or domain extension");
        formattedValue = "";
      }
    }
    
    // Update data
    setData(prevData => prevData.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          [colKey]: formattedValue
        };
      }
      return row;
    }));
    
    // Show save indicator
    setShowSaveIndicator({ row: rowId, col: colKey });
    setTimeout(() => setShowSaveIndicator(null), 500);
    
    setActiveCell(null);
  };

  const handleDateSelection = (date: Date | undefined) => {
    if (date && activeDateCell) {
      // Save previous state for undo
      saveStateToHistory();
      
      // Format date as string (e.g., "Apr 15, 2023")
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      // Update data
      setData(prevData => prevData.map(row => {
        if (row.id === activeDateCell.row) {
          return {
            ...row,
            [activeDateCell.col]: formattedDate
          };
        }
        return row;
      }));
      
      // Show save indicator
      setShowSaveIndicator({ row: activeDateCell.row, col: activeDateCell.col });
      setTimeout(() => setShowSaveIndicator(null), 500);
    }
    
    setDatePickerOpen(false);
    setActiveDateCell(null);
  };
  
  const handleSelectOption = (value: string) => {
    if (activeSelectCell) {
      // Save previous state for undo
      saveStateToHistory();
      
      // Update data
      setData(prevData => prevData.map(row => {
        if (row.id === activeSelectCell.row) {
          return {
            ...row,
            [activeSelectCell.col]: value
          };
        }
        return row;
      }));
      
      // Show save indicator
      setShowSaveIndicator({ row: activeSelectCell.row, col: activeSelectCell.col });
      setTimeout(() => setShowSaveIndicator(null), 500);
    }
    
    setSelectDropdownOpen(false);
    setActiveSelectCell(null);
  };

  const saveStateToHistory = () => {
    // Save current state to undo stack
    setUndoStack(prev => [...prev, { columns, data }]);
    // Clear redo stack when new action is performed
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length > 0) {
      // Get last state from undo stack
      const lastState = undoStack[undoStack.length - 1];
      // Remove last state from undo stack
      setUndoStack(prev => prev.slice(0, -1));
      // Save current state to redo stack
      setRedoStack(prev => [...prev, { columns, data }]);
      // Restore last state
      setColumns(lastState.columns);
      setData(lastState.data);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      // Get last state from redo stack
      const nextState = redoStack[redoStack.length - 1];
      // Remove last state from redo stack
      setRedoStack(prev => prev.slice(0, -1));
      // Save current state to undo stack
      setUndoStack(prev => [...prev, { columns, data }]);
      // Restore next state
      setColumns(nextState.columns);
      setData(nextState.data);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle undo/redo
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      if (e.shiftKey) {
        // Redo: Ctrl/Cmd + Shift + Z
        redo();
      } else {
        // Undo: Ctrl/Cmd + Z
        undo();
      }
    }
  };

  const addColumn = () => {
    // Save current state for undo
    saveStateToHistory();
    
    const key = newColumn.header.toLowerCase().replace(/\s+/g, '_');
    
    // Add new column to columns array
    const newColumnDef: ColumnDef = {
      key,
      header: newColumn.header,
      type: newColumn.type,
      editable: true,
      options: newColumn.type === 'select' || newColumn.type === 'status' ? newColumn.options : undefined
    };
    
    setColumns(prev => [...prev, newColumnDef]);
    
    // Add default values for new column to all rows
    setData(prevData => prevData.map(row => {
      return {
        ...row,
        [key]: newColumn.type === 'checkbox' ? false : ''
      };
    }));
    
    // Reset new column state
    setNewColumn({ header: '', type: 'text' });
    setIsAddingColumn(false);
    
    toast.success(`Column "${newColumn.header}" added successfully`);
  };

  const deleteColumn = (key: string) => {
    // Don't allow deleting the opportunity column
    if (key === "opportunity") {
      toast.error("The Opportunity column cannot be deleted");
      return;
    }
    
    // Save current state for undo
    saveStateToHistory();
    
    // Remove column from columns array
    setColumns(prev => prev.filter(col => col.key !== key));
    
    // Remove column data from all rows
    setData(prev => prev.map(row => {
      const { [key]: _, ...rest } = row;
      return rest as RowData; // Explicitly cast to RowData to ensure id property exists
    }));
    
    toast.success("Column deleted");
  };

  const duplicateColumn = (column: ColumnDef) => {
    // Save current state for undo
    saveStateToHistory();
    
    const newKey = `${column.key}_copy`;
    const newHeader = `${column.header} (Copy)`;
    
    // Create duplicate column
    const duplicatedColumn: ColumnDef = {
      ...column,
      key: newKey,
      header: newHeader,
      frozen: false // Duplicated columns are never frozen
    };
    
    // Add duplicate column to columns array
    setColumns(prev => [...prev, duplicatedColumn]);
    
    // Add duplicate data to all rows
    setData(prev => prev.map(row => ({
      ...row,
      [newKey]: row[column.key]
    })));
    
    toast.success(`Column "${column.header}" duplicated`);
  };

  const renameColumn = (key: string, newName: string) => {
    // Don't allow renaming the opportunity column
    if (key === "opportunity") {
      toast.error("The Opportunity column cannot be renamed");
      return;
    }
    
    // Save current state for undo
    saveStateToHistory();
    
    // Update column header
    setColumns(prev => prev.map(col => {
      if (col.key === key) {
        return {
          ...col,
          header: newName
        };
      }
      return col;
    }));
    
    toast.success(`Column renamed to "${newName}"`);
  };

  const sortColumn = (key: string, direction: 'asc' | 'desc') => {
    // Save current state for undo
    saveStateToHistory();
    
    const column = columns.find(col => col.key === key);
    if (!column) return;
    
    // Sort data based on column type
    setData(prev => [...prev].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];
      
      if (column.type === 'number' || column.type === 'currency') {
        // Convert to numbers for numeric comparison
        const aNum = parseFloat(String(aValue).replace(/[^0-9.-]+/g, ''));
        const bNum = parseFloat(String(bValue).replace(/[^0-9.-]+/g, ''));
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      if (column.type === 'date') {
        // Convert to dates for date comparison
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return direction === 'asc' 
          ? aDate.getTime() - bDate.getTime() 
          : bDate.getTime() - aDate.getTime();
      }
      
      // Default to string comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return direction === 'asc' 
        ? aStr.localeCompare(bStr) 
        : bStr.localeCompare(aStr);
    }));
    
    toast.success(`Sorted by ${column.header} (${direction === 'asc' ? 'Ascending' : 'Descending'})`);
  };

  const moveColumn = (key: string, direction: 'left' | 'right') => {
    // Don't allow moving the opportunity column
    if (key === "opportunity" && direction === "left") {
      toast.error("The Opportunity column must remain first");
      return;
    }
    
    // Save current state for undo
    saveStateToHistory();
    
    const columnIndex = columns.findIndex(col => col.key === key);
    if (columnIndex === -1) return;
    
    // Calculate new index
    const newIndex = direction === 'left' 
      ? Math.max(0, columnIndex - 1)
      : Math.min(columns.length - 1, columnIndex + 1);
    
    // Don't do anything if we're already at the edge
    if (newIndex === columnIndex) return;
    
    // Don't allow other columns to move to the leftmost position if opportunity column exists
    if (newIndex === 0 && columns.some(col => col.key === "opportunity")) {
      toast.error("The Opportunity column must remain first");
      return;
    }
    
    // Create new columns array with moved column
    const newColumns = [...columns];
    const [removed] = newColumns.splice(columnIndex, 1);
    newColumns.splice(newIndex, 0, removed);
    
    setColumns(newColumns);
  };

  const handleDragStart = (key: string) => {
    // Don't allow dragging the opportunity column
    if (key === "opportunity") {
      toast.error("The Opportunity column cannot be reordered");
      return;
    }
    
    setDraggedColumn(key);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    // Don't allow dropping to the left of the opportunity column
    if (key === "opportunity" && columns[0]?.key === "opportunity") {
      return;
    }
    
    if (draggedColumn && draggedColumn !== key) {
      setDragOverColumn(key);
    }
  };

  const handleDrop = (key: string) => {
    if (!draggedColumn || draggedColumn === key) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    // Don't allow dropping to the left of the opportunity column
    if (key === "opportunity" && columns[0]?.key === "opportunity") {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    // Save current state for undo
    saveStateToHistory();
    
    const fromIndex = columns.findIndex(col => col.key === draggedColumn);
    let toIndex = columns.findIndex(col => col.key === key);
    
    // Prevent moving to position 0 if opportunity column exists and is first
    if (toIndex === 0 && columns[0]?.key === "opportunity") {
      toIndex = 1;
    }
    
    if (fromIndex !== -1 && toIndex !== -1) {
      // Create new columns array with reordered columns
      const newColumns = [...columns];
      const [removed] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, removed);
      
      setColumns(newColumns);
    }
    
    setDraggedColumn(null);
    setDragOverColumn(null);
  };
  
  // Calculate frozen and scrollable columns
  const frozenColumns = columns.filter(col => col.frozen);
  const scrollableColumns = columns.filter(col => !col.frozen);
  
  // Calculate grid template columns for both sections
  const frozenColsTemplate = frozenColumns.length > 0 
    ? `40px repeat(${frozenColumns.length}, minmax(150px, 1fr))`
    : "40px";
    
  const scrollableColsTemplate = `repeat(${scrollableColumns.length}, minmax(150px, 1fr)) auto`;
  
  return (
    <div className="h-full flex flex-col" onKeyDown={handleKeyDown} tabIndex={-1}>
      {/* Toolbar */}
      <GridToolbar listType={listType} columns={columns} />
      
      {/* Grid Headers */}
      <GridHeaders 
        frozenColumns={frozenColumns}
        scrollableColumns={scrollableColumns}
        frozenColsTemplate={frozenColsTemplate}
        scrollableColsTemplate={scrollableColsTemplate}
        editingHeader={editingHeader}
        setEditingHeader={setEditingHeader}
        draggedColumn={draggedColumn}
        dragOverColumn={dragOverColumn}
        headerRef={headerRef}
        isAddingColumn={isAddingColumn}
        setIsAddingColumn={setIsAddingColumn}
        newColumn={newColumn}
        setNewColumn={setNewColumn}
        addColumn={addColumn}
        onHeaderDoubleClick={handleHeaderDoubleClick}
        onRenameColumn={renameColumn}
        onDuplicateColumn={duplicateColumn}
        onMoveColumn={moveColumn}
        onSortColumn={sortColumn}
        onDeleteColumn={deleteColumn}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      
      {/* Grid Content */}
      <div className="overflow-auto flex-1" ref={bodyRef}>
        {data.map((row) => (
          <GridRow
            key={row.id}
            rowData={row}
            frozenColumns={frozenColumns}
            scrollableColumns={scrollableColumns}
            frozenColsTemplate={frozenColsTemplate}
            scrollableColsTemplate={scrollableColsTemplate}
            activeCell={activeCell}
            showSaveIndicator={showSaveIndicator}
            onCellClick={handleCellClick}
            onCellChange={handleCellChange}
          />
        ))}
      </div>
      
      {/* Date picker */}
      <GridDatePicker 
        isOpen={datePickerOpen}
        position={calendarAnchor}
        selectedDate={selectedDate}
        onClose={() => setDatePickerOpen(false)}
        onSelect={handleDateSelection}
      />
      
      {/* Select dropdown */}
      {activeSelectCell && (
        <GridSelectDropdown
          isOpen={selectDropdownOpen}
          position={calendarAnchor}
          options={activeSelectCell.options}
          onSelect={handleSelectOption}
        />
      )}
    </div>
  );
}
