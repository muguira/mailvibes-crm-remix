
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
    <div className="add-column-cell">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-6 h-6 p-0 rounded-full bg-teal-primary/10 hover:bg-teal-primary/20"
        onClick={() => setIsAddingColumn(true)}
        title="Add new column"
        aria-label="Add new column"
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
