
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
    <div className="grid-header-cell">
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
