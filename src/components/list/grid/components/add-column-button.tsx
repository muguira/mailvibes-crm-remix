
import { Plus } from "lucide-react";
import { AddColumnDialog } from "./add-column-dialog";
import { ColumnType } from "../types";
import { Button } from "@/components/ui/button";

interface AddColumnButtonProps {
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
}

export function AddColumnButton({
  isAddingColumn,
  setIsAddingColumn,
  newColumn,
  setNewColumn,
  addColumn
}: AddColumnButtonProps) {
  return (
    <div 
      className="add-column-cell"
      style={{
        position: 'sticky',
        right: 0,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: '40px',
        width: '40px',
        height: 'var(--row-height, 32px)',
        padding: 0,
        background: '#f8f9fa',
        borderLeft: '1px solid #e0e5eb',
        boxShadow: '-2px 0 4px -2px rgba(0,0,0,0.05)',
        visibility: 'visible !important',
        opacity: 1
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-6 h-6 p-0 rounded-full bg-teal-primary/10 hover:bg-teal-primary/20"
        onClick={() => setIsAddingColumn(true)}
        title="Add new column"
        aria-label="Add new column"
        style={{
          visibility: 'visible !important',
          opacity: 1,
          display: 'flex'
        }}
      >
        <Plus size={14} className="text-teal-primary" />
      </Button>
      
      <AddColumnDialog
        isAddingColumn={isAddingColumn}
        setIsAddingColumn={setIsAddingColumn}
        newColumn={newColumn}
        setNewColumn={setNewColumn}
        addColumn={addColumn}
      />
    </div>
  );
}
