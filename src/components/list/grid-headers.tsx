
import { Plus, ColorPicker } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GridHeaderCell } from "./grid-header-cell";
import { ColumnDef, ColumnType } from "./grid-view";
import { RefObject, useState } from "react";
import { StatusColorPicker } from "./cell-types/color-picker";

interface GridHeadersProps {
  frozenColumns: ColumnDef[];
  scrollableColumns: ColumnDef[];
  frozenColsTemplate: string;
  scrollableColsTemplate: string;
  editingHeader: string | null;
  setEditingHeader: (key: string | null) => void;
  draggedColumn: string | null;
  dragOverColumn: string | null;
  headerRef: RefObject<HTMLDivElement>;
  isAddingColumn: boolean;
  setIsAddingColumn: (isAdding: boolean) => void;
  newColumn: {
    header: string;
    type: ColumnType;
    options?: string[];
    colors?: Record<string, string>;
  };
  setNewColumn: (newCol: {
    header: string;
    type: ColumnType;
    options?: string[];
    colors?: Record<string, string>;
  }) => void;
  addColumn: () => void;
  onHeaderDoubleClick: (colKey: string) => void;
  onRenameColumn: (colKey: string, newName: string) => void;
  onDuplicateColumn: (column: ColumnDef) => void;
  onMoveColumn: (colKey: string, direction: 'left' | 'right') => void;
  onSortColumn: (colKey: string, direction: 'asc' | 'desc') => void;
  onDeleteColumn: (colKey: string) => void;
  onDragStart: (key: string) => void;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDrop: (key: string) => void;
  onColumnResize?: (colKey: string, newWidth: number) => void;
}

export function GridHeaders({
  frozenColumns,
  scrollableColumns,
  frozenColsTemplate,
  scrollableColsTemplate,
  editingHeader,
  setEditingHeader,
  draggedColumn,
  dragOverColumn,
  headerRef,
  isAddingColumn,
  setIsAddingColumn,
  newColumn,
  setNewColumn,
  addColumn,
  onHeaderDoubleClick,
  onRenameColumn,
  onDuplicateColumn,
  onMoveColumn,
  onSortColumn,
  onDeleteColumn,
  onDragStart,
  onDragOver,
  onDrop,
  onColumnResize
}: GridHeadersProps) {
  const [optionDraft, setOptionDraft] = useState("");
  
  const handleAddOption = () => {
    if (!optionDraft.trim()) return;
    
    const newOptions = [...(newColumn.options || []), optionDraft.trim()];
    const newColors = { ...(newColumn.colors || {}) };
    
    // Set default color for new option
    if (newColumn.type === 'status' && !newColors[optionDraft.trim()]) {
      newColors[optionDraft.trim()] = '#4ADE80'; // Default green color
    }
    
    setNewColumn({
      ...newColumn,
      options: newOptions,
      colors: newColors
    });
    setOptionDraft("");
  };

  const handleRemoveOption = (option: string) => {
    const newOptions = (newColumn.options || []).filter(opt => opt !== option);
    const newColors = { ...(newColumn.colors || {}) };
    
    // Remove color for removed option
    if (newColors[option]) {
      delete newColors[option];
    }
    
    setNewColumn({
      ...newColumn,
      options: newOptions,
      colors: newColors
    });
  };

  const updateOptionColor = (option: string, color: string) => {
    setNewColumn({
      ...newColumn,
      colors: {
        ...(newColumn.colors || {}),
        [option]: color
      }
    });
  };

  return (
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
            <GridHeaderCell
              key={column.key}
              column={column}
              editingHeader={editingHeader}
              setEditingHeader={setEditingHeader}
              onHeaderDoubleClick={onHeaderDoubleClick}
              onRenameColumn={onRenameColumn}
              onDuplicateColumn={onDuplicateColumn}
              onMoveColumn={onMoveColumn}
              onSortColumn={onSortColumn}
              onDeleteColumn={onDeleteColumn}
              onResize={onColumnResize}
            />
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
          <GridHeaderCell
            key={column.key}
            column={column}
            editingHeader={editingHeader}
            setEditingHeader={setEditingHeader}
            onHeaderDoubleClick={onHeaderDoubleClick}
            onRenameColumn={onRenameColumn}
            onDuplicateColumn={onDuplicateColumn}
            onMoveColumn={onMoveColumn}
            onSortColumn={onSortColumn}
            onDeleteColumn={onDeleteColumn}
            dragOverColumn={dragOverColumn}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            draggable={true}
            onResize={onColumnResize}
          />
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
                    onChange={(e) => {
                      setNewColumn({
                        ...newColumn,
                        header: e.target.value
                      });
                    }}
                    className="w-full p-2 border border-slate-light/50 rounded"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="column-type" className="text-sm font-medium">
                    Column Type
                  </label>
                  <Select
                    value={newColumn.type}
                    onValueChange={(value: ColumnType) => {
                      setNewColumn({
                        ...newColumn,
                        type: value,
                        options: value === 'status' || value === 'select' ? ['Yes', 'No'] : undefined,
                        colors: value === 'status' ? { 'Yes': '#4ADE80', 'No': '#FB7185' } : undefined
                      });
                    }}
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
                      Options 
                    </label>
                    <div className="flex space-x-2">
                      <input
                        id="column-options"
                        value={optionDraft}
                        onChange={(e) => setOptionDraft(e.target.value)}
                        placeholder="Add option"
                        className="flex-1 p-2 border border-slate-light/50 rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOption();
                          }
                        }}
                      />
                      <button
                        onClick={handleAddOption}
                        className="px-3 py-1.5 bg-teal-primary text-white rounded hover:bg-teal-primary/90"
                      >
                        Add
                      </button>
                    </div>
                    
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {newColumn.options?.map((option) => (
                        <div key={option} className="flex items-center justify-between bg-slate-light/10 p-2 rounded">
                          <div className="flex items-center gap-2">
                            {newColumn.type === 'status' && (
                              <StatusColorPicker 
                                color={newColumn.colors?.[option] || '#4ADE80'}
                                onChange={(color) => updateOptionColor(option, color)}
                              />
                            )}
                            <span>{option}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveOption(option)}
                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
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
  );
}
