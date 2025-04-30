
interface UseDragDropProps {
  setDraggedColumn: React.Dispatch<React.SetStateAction<string | null>>;
  setDragOverColumn: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useDragDrop({ 
  setDraggedColumn, 
  setDragOverColumn 
}: UseDragDropProps) {
  
  // Drag handlers
  const handleDragStart = (key: string) => {
    console.log("Drag start:", key);
    setDraggedColumn(key);
  };
  
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverColumn(key);
  };
  
  const handleDrop = (draggedColumn: string | null, columns: any[], setColumns: any) => (key: string) => {
    console.log("Drop on:", key);
    if (!draggedColumn) return;
    
    const draggingColIndex = columns.findIndex(col => col.key === draggedColumn);
    const dropColIndex = columns.findIndex(col => col.key === key);
    
    if (draggingColIndex === dropColIndex) return;
    
    // Create new columns array with reordered columns
    const newColumns = [...columns];
    const [draggedCol] = newColumns.splice(draggingColIndex, 1);
    newColumns.splice(dropColIndex, 0, draggedCol);
    
    setColumns(newColumns);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  return {
    handleDragStart,
    handleDragOver,
    handleDrop
  };
}
