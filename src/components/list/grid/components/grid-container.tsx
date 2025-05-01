
import { ReactNode } from "react";
import { GridContainerProps } from "@/components/grid-view/types";

interface GridContainerWrapperProps extends GridContainerProps {
  children: ReactNode;
  listId?: string;
  onCellChange?: (rowId: string, colKey: string, value: any) => void;
  onAddItem?: (() => void) | null;
  onDeleteColumn?: (columnId: string) => void;
  onAddColumn?: (afterColumnId: string) => void;
}

export function GridContainer({ children, ...props }: GridContainerWrapperProps) {
  return (
    <div 
      className="h-full flex flex-col full-screen-grid relative" 
      style={{ 
        position: 'relative',
        height: 'calc(100vh - 120px)',
        zIndex: 5,
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
}
