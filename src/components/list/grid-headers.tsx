
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GridHeaderCell } from "./grid-header-cell";
import { ColumnDef, ColumnType } from "./grid/types";
import { RefObject } from "react";

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
  };
  setNewColumn: (newCol: {
    header: string;
    type: ColumnType;
    options?: string[];
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
  onDrop
}: GridHeadersProps) {
  return (
    <div className="flex grid-container">
      {/* Row number header */}
      <div className="row-number-header"></div>
      
      {/* Edit column header */}
      <div className="edit-column-header"></div>
      
      {/* Frozen header columns */}
      {frozenColumns.length > 0 && (
        <div
          className="grid-header"
          style={{
            boxShadow: "5px 0 5px -2px rgba(0,0,0,0.05)",
            position: "sticky",
            left: "72px" // Account for row number + edit column
          }}
        >
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
            />
          ))}
        </div>
      )}

      {/* Scrollable header columns */}
      <div
        className="grid-header"
        style={{ 
          marginLeft: frozenColumns.length > 0 ? 0 : "72px" // Adjust margin if no frozen columns
        }}
        ref={headerRef}
      >
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
                    value={newColumn?.header || ""}
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
                    value={newColumn?.type || "text"}
                    onValueChange={(value: ColumnType) => {
                      setNewColumn({
                        ...newColumn,
                        type: value
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

                {(newColumn?.type === 'select' || newColumn?.type === 'status') && (
                  <div className="space-y-2">
                    <label htmlFor="column-options" className="text-sm font-medium">
                      Options (one per line)
                    </label>
                    <textarea
                      id="column-options"
                      className="w-full p-2 border border-slate-light/50 rounded h-24"
                      onChange={(e) => {
                        setNewColumn({
                          ...newColumn,
                          options: e.target.value.split('\n').filter(opt => opt.trim() !== '')
                        });
                      }}
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
                  disabled={!newColumn?.header}
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
