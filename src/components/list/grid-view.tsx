import { useState, useRef, useEffect } from "react";
import { 
  ChevronDown, 
  Filter, 
  Plus, 
  FileDown, 
  ChevronRight, 
  ArrowDownAZ, 
  ArrowUpZA,
  Edit,
  Check,
  X,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  SortDesc,
  SortAsc,
  PencilLine,
  CalendarIcon,
  ExternalLink
} from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

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
  const [filterOpen, setFilterOpen] = useState(false);
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
  
  // Validate URLs
  const isValidUrl = (url: string) => {
    // Simple validation for common URL patterns
    const urlPatterns = [
      /^https?:\/\//i, // Starts with http:// or https://
      /\.(com|io|org|net|dev|co|app|ai)($|\/)/i, // Common TLDs
      /^www\./i // Starts with www.
    ];
    
    return urlPatterns.some(pattern => pattern.test(url));
  };
  
  const formatUrl = (url: string) => {
    if (!url) return url;
    
    // If it doesn't have a protocol but looks like a domain, add https://
    if (!url.match(/^https?:\/\//i) && (url.includes('.') || url.startsWith('www.'))) {
      return `https://${url}`;
    }
    
    return url;
  };

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
        window.open(formatUrl(url), "_blank");
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
  
  const handleHeaderEditComplete = (key: string, newName: string) => {
    if (!newName.trim() || newName.trim() === columns.find(col => col.key === key)?.header) {
      setEditingHeader(null);
      return;
    }
    
    renameColumn(key, newName);
    setEditingHeader(null);
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
  
  const handleSelectOption = (rowId: string, colKey: string, value: string) => {
    if (activeSelectCell) {
      // Save previous state for undo
      saveStateToHistory();
      
      // Update data
      setData(prevData => prevData.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            [colKey]: value
          };
        }
        return row;
      }));
      
      // Show save indicator
      setShowSaveIndicator({ row: rowId, col: colKey });
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
      <div className="bg-white border-b border-slate-light/30 p-2 flex items-center justify-between">
        <div className="flex items-center">
          <button className="p-1 rounded hover:bg-slate-light/20 text-slate-medium">
            <input type="checkbox" className="mr-2" />
          </button>
          <button className="ml-2 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-light/20 text-slate-medium">
            <FileDown size={18} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <CustomButton 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter size={14} />
              <span>Filters</span>
              <span className="text-xs bg-teal-primary text-white rounded-full px-1.5">2</span>
            </CustomButton>
            
            {filterOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-light/50 shadow-relate rounded-md z-20">
                <div className="p-3 border-b border-slate-light/30">
                  <p className="font-semibold text-sm">Custom Filter</p>
                </div>
                
                <div className="p-3 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {columns.map(col => (
                      <div key={col.key} className="flex items-center">
                        <input type="checkbox" id={`filter-${col.key}`} className="mr-2" />
                        <label htmlFor={`filter-${col.key}`} className="text-sm">{col.header}</label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-3 border-t border-slate-light/30 flex justify-end space-x-2">
                  <button className="px-3 py-1 text-sm border border-slate-light/50 rounded">
                    Close
                  </button>
                  <button className="px-3 py-1 text-sm bg-teal-primary text-white rounded">
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <CustomButton 
            variant="default" 
            size="sm"
            className="flex items-center gap-1"
          >
            <Plus size={14} />
            <span>Add {listType}</span>
          </CustomButton>
        </div>
      </div>
      
      {/* Grid Headers - Split into frozen and scrollable sections */}
      <div className="flex">
        {/* Frozen header columns */}
        {frozenColumns.length > 0 && (
          <div 
            className="grid-header grid z-10" 
            style={{ 
              gridTemplateColumns: frozenColsTemplate,
              boxShadow: "5px 0 5px -2px rgba(0,0,0,0.05)",
              position: "sticky",
              left: 0
            }}
          >
            <div className="grid-header-cell"></div>
            {frozenColumns.map((column) => (
              <div 
                key={column.key} 
                className="grid-header-cell"
                onDoubleClick={() => handleHeaderDoubleClick(column.key)}
              >
                {editingHeader === column.key ? (
                  <input 
                    type="text"
                    className="w-full bg-transparent outline-none border-b border-teal-primary"
                    defaultValue={column.header}
                    autoFocus
                    onBlur={(e) => handleHeaderEditComplete(column.key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleHeaderEditComplete(column.key, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingHeader(null);
                      }
                    }}
                  />
                ) : (
                  // Don't style the opportunity header as a link
                  <span className="font-medium text-navy-deep">
                    {column.header}
                  </span>
                )}
                
                <div className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 rounded hover:bg-slate-light/20">
                      <ChevronDown size={14} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {column.key !== "opportunity" && (
                        <DropdownMenuItem onClick={() => {
                          const newName = prompt("Rename column:", column.header);
                          if (newName) renameColumn(column.key, newName);
                        }}>
                          <PencilLine size={14} className="mr-2" />
                          Rename
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => duplicateColumn(column)}>
                        <Copy size={14} className="mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {column.key !== "opportunity" && (
                        <>
                          <DropdownMenuItem onClick={() => moveColumn(column.key, 'left')}>
                            <ArrowLeft size={14} className="mr-2" />
                            Move Left
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => moveColumn(column.key, 'right')}>
                            <ArrowRight size={14} className="mr-2" />
                            Move Right
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => sortColumn(column.key, 'asc')}>
                        <SortAsc size={14} className="mr-2" />
                        Sort A-Z
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => sortColumn(column.key, 'desc')}>
                        <SortDesc size={14} className="mr-2" />
                        Sort Z-A
                      </DropdownMenuItem>
                      {column.key !== "opportunity" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteColumn(column.key)} className="text-red-500">
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Scrollable header columns */}
        <div 
          className="grid-header grid overflow-hidden" 
          style={{ gridTemplateColumns: scrollableColsTemplate }}
          ref={headerRef}
        >
          {frozenColumns.length === 0 && <div className="grid-header-cell"></div>}
          
          {scrollableColumns.map((column) => (
            <div 
              key={column.key} 
              className={`grid-header-cell ${dragOverColumn === column.key ? 'border-l-2 border-r-2 border-teal-primary' : ''}`}
              draggable
              onDragStart={() => handleDragStart(column.key)}
              onDragOver={(e) => handleDragOver(e, column.key)}
              onDrop={() => handleDrop(column.key)}
              onDoubleClick={() => handleHeaderDoubleClick(column.key)}
            >
              {editingHeader === column.key ? (
                <input 
                  type="text"
                  className="w-full bg-transparent outline-none border-b border-teal-primary"
                  defaultValue={column.header}
                  autoFocus
                  onBlur={(e) => handleHeaderEditComplete(column.key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleHeaderEditComplete(column.key, e.currentTarget.value);
                    } else if (e.key === 'Escape') {
                      setEditingHeader(null);
                    }
                  }}
                />
              ) : (
                <span>{column.header}</span>
              )}
              
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1 rounded hover:bg-slate-light/20">
                    <ChevronDown size={14} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      const newName = prompt("Rename column:", column.header);
                      if (newName) renameColumn(column.key, newName);
                    }}>
                      <PencilLine size={14} className="mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateColumn(column)}>
                      <Copy size={14} className="mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => moveColumn(column.key, 'left')}>
                      <ArrowLeft size={14} className="mr-2" />
                      Move Left
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => moveColumn(column.key, 'right')}>
                      <ArrowRight size={14} className="mr-2" />
                      Move Right
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => sortColumn(column.key, 'asc')}>
                      <SortAsc size={14} className="mr-2" />
                      Sort A-Z
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sortColumn(column.key, 'desc')}>
                      <SortDesc size={14} className="mr-2" />
                      Sort Z-A
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => deleteColumn(column.key)} className="text-red-500">
                      <Trash2 size={14} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          
          {/* Add Column button */}
          <div className="grid-header-cell">
            <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
              <DialogTrigger asChild>
                <button className="w-6 h-6 flex items-center justify-center rounded-full bg-teal-primary/10 hover:bg-teal-primary/20 text-teal-primary">
                  <Plus size={14} />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Column</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="column-name" className="text-sm font-medium">
                      Column Name
                    </label>
                    <input
                      id="column-name"
                      value={newColumn.header}
                      onChange={(e) => setNewColumn(prev => ({ ...prev, header: e.target.value }))}
                      className="w-full p-2 border border-slate-light/50 rounded"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="column-type" className="text-sm font-medium">
                      Column Type
                    </label>
                    <Select 
                      value={newColumn.type} 
                      onValueChange={(value: ColumnType) => 
                        setNewColumn(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="currency">Currency</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="checkbox">Checkbox</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(newColumn.type === 'select' || newColumn.type === 'status') && (
                    <div className="space-y-2">
                      <label htmlFor="column-options" className="text-sm font-medium">
                        Options (one per line)
                      </label>
                      <textarea
                        id="column-options"
                        className="w-full p-2 border border-slate-light/50 rounded h-24"
                        onChange={(e) => setNewColumn(prev => ({ 
                          ...prev, 
                          options: e.target.value.split('\n').filter(opt => opt.trim() !== '')
                        }))}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <CustomButton
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingColumn(false)}
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    variant="default"
                    size="sm"
                    onClick={addColumn}
                    disabled={!newColumn.header}
                  >
                    Add Column
                  </CustomButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      
      {/* Grid Content */}
      <div className="overflow-auto flex-1" ref={bodyRef}>
        {data.map((row, rowIndex) => (
          <div 
            key={row.id}
            className="flex"
          >
            {/* Frozen cells */}
            {frozenColumns.length > 0 && (
              <div 
                className="grid grid-row" 
                style={{
                  gridTemplateColumns: frozenColsTemplate,
                  position: "sticky",
                  left: 0,
                  zIndex: 5,
                  backgroundColor: "white",
                  boxShadow: "5px 0 5px -2px rgba(0,0,0,0.05)"
                }}
              >
                <div className="grid-cell flex items-center">
                  <input type="checkbox" className="ml-2" />
                  <button className="ml-2 text-slate-medium">
                    <Edit size={14} />
                  </button>
                </div>
                
                {frozenColumns.map(column => (
                  <div 
                    key={`${row.id}-${column.key}`}
                    className={`grid-cell relative ${column.key === "opportunity" ? "text-teal-primary hover:underline cursor-pointer" : ""}`}
                    onClick={() => column.editable && handleCellClick(row.id, column.key, column.type)}
                    tabIndex={0}
                    data-cell={`${row.id}-${column.key}`}
                  >
                    {activeCell?.row === row.id && activeCell?.col === column.key ? (
                      <input 
                        type="text"
                        className="w-full bg-transparent outline-none"
                        defaultValue={row[column.key]}
                        autoFocus
                        onBlur={(e) => handleCellChange(row.id, column.key, e.target.value, column.type)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCellChange(row.id, column.key, e.currentTarget.value, column.type);
                          } else if (e.key === 'Escape') {
                            setActiveCell(null);
                          }
                        }}
                      />
                    ) : (
                      <span>{row[column.key]}</span>
                    )}
                    
                    {showSaveIndicator && showSaveIndicator.row === row.id && showSaveIndicator.col === column.key && (
                      <div className="save-indicator">
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Scrollable cells */}
            <div 
              className="grid grid-row" 
              style={{ gridTemplateColumns: scrollableColsTemplate }}
            >
              {frozenColumns.length === 0 && (
                <div className="grid-cell flex items-center">
                  <input type="checkbox" className="ml-2" />
                  <button className="ml-2 text-slate-medium">
                    <Edit size={14} />
                  </button>
                </div>
              )}
              
              {scrollableColumns.map((column) => (
                <div 
                  key={`${row.id}-${column.key}`} 
                  className={`grid-cell ${activeCell?.row === row.id && activeCell?.col === column.key ? 'bg-blue-50' : ''} ${
                    column.type === 'currency' ? 'text-right' : ''
                  } relative ${column.type === 'url' && row[column.key] ? 'text-teal-primary hover:underline cursor-pointer' : ''}`}
                  onClick={() => column.editable && handleCellClick(row.id, column.key, column.type, column.options)}
                  tabIndex={0}
                  data-cell={`${row.id}-${column.key}`}
                >
                  {activeCell?.row === row.id && activeCell?.col === column.key ? (
                    <input 
                      type={column.type === 'number' || column.type === 'currency' ? 'number' : 'text'}
                      className="w-full bg-transparent outline-none"
                      defaultValue={column.type === 'currency' ? row[column.key]?.replace(/[^0-9.-]+/g, '') : row[column.key]}
                      autoFocus
                      onBlur={(e) => handleCellChange(row.id, column.key, e.target.value, column.type)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCellChange(row.id, column.key, e.currentTarget.value, column.type);
                        } else if (e.key === 'Escape') {
                          setActiveCell(null);
                        }
                      }}
                    />
                  ) : column.type === 'status' ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      row[column.key] === 'Deal Won' ? 'bg-teal-primary/20 text-teal-primary' : 
                      row[column.key] === 'Qualified' ? 'bg-blue-100 text-blue-600' : 
                      row[column.key] === 'In Procurement' ? 'bg-purple-100 text-purple-600' :
                      row[column.key] === 'Contract Sent' ? 'bg-yellow-100 text-yellow-600' :
                      row[column.key] === 'Discovered' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {row[column.key]}
                    </span>
                  ) : column.type === 'checkbox' ? (
                    <div className="flex justify-center">
                      <Checkbox 
                        checked={!!row[column.key]} 
                        onCheckedChange={() => toggleCheckbox(row.id, column.key)}
                      />
                    </div>
                  ) : column.type === 'url' && row[column.key] ? (
                    <div className="flex items-center">
                      <span>{row[column.key]}</span>
                      <ExternalLink size={14} className="ml-1" />
                    </div>
                  ) : (
                    <span>{row[column.key]}</span>
                  )}
                  
                  {/* Save indicator */}
                  {showSaveIndicator && showSaveIndicator.row === row.id && showSaveIndicator.col === column.key && (
                    <div className="save-indicator">
                      <Check size={16} />
                    </div>
                  )}
                </div>
              ))}
              <div className="grid-cell"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Date picker popover */}
      {datePickerOpen && activeDateCell && (
        <div 
          className="fixed bg-white shadow-lg rounded-md z-50 border border-slate-200"
          style={{
            top: calendarAnchor.top + 'px',
            left: calendarAnchor.left + 'px',
            width: '280px',
            borderRadius: '12px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
          }}
        >
          <div className="flex justify-between items-center p-2 border-b">
            <span className="text-sm font-medium">Select Date</span>
            <button 
              onClick={() => setDatePickerOpen(false)}
              className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelection}
            initialFocus
            className="p-3 pointer-events-auto"
          />
          <div className="flex justify-end p-2 border-t">
            <CustomButton 
              variant="outline" 
              size="sm" 
              className="mr-2"
              onClick={() => setDatePickerOpen(false)}
            >
              Cancel
            </CustomButton>
            <CustomButton 
              variant="default" 
              size="sm"
              onClick={() => handleDateSelection(selectedDate)}
            >
              Apply
            </CustomButton>
          </div>
        </div>
      )}
      
      {/* Select dropdown */}
      {selectDropdownOpen && activeSelectCell && (
        <div 
          className="fixed bg-white shadow-lg rounded-md z-50 border border-slate-200"
          style={{
            top: calendarAnchor.top + 'px',
            left: calendarAnchor.left + 'px',
            width: '200px'
          }}
        >
          <div className="py-1">
            {activeSelectCell.options.map((option) => (
              <button
                key={option}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                onClick={() => handleSelectOption(activeSelectCell.row, activeSelectCell.col, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
