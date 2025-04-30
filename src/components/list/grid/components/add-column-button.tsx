
import { Plus } from "lucide-react";
import { AddColumnDialog } from "./add-column-dialog";
import { ColumnType } from "../types";

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
      className="grid-header-cell add-column-cell"
      style={{ 
        position: 'sticky',
        right: 0,
        zIndex: 12,
        background: '#f8f9fa',
        boxShadow: '-2px 0 4px -2px rgba(0,0,0,0.1)',
        minWidth: '40px',
        width: '40px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0
      }}
    >
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
