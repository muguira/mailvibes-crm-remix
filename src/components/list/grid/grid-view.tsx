
import { SaveIndicatorProvider } from "./contexts/save-indicator-context";
import { GridContainer, GridViewContent } from "./components";
import { GridViewProps } from "./types";
import { normalizeColumns } from "./utils/normalize-columns";
import "./grid-view.css";

// Main GridView wrapper with providers
export function GridView(props: GridViewProps & { 
  listId?: string,
  onCellChange?: (rowId: string, colKey: string, value: any) => void,
  onAddItem?: (() => void) | null,
  onDeleteColumn?: (columnId: string) => void,
  onAddColumn?: (afterColumnId: string) => void
}) {
  // Normalize columns to match the expected type in GridContainer
  const normalizedColumns = normalizeColumns(props.columns);
  
  // Sanity checks
  console.info('[GRID] cols', normalizedColumns.length);
  console.info('[GRID] rows', props.data?.length || 0);
  
  return (
    <SaveIndicatorProvider>
      <GridContainer 
        {...props} 
        columns={normalizedColumns}
      >
        <GridViewContent {...props} />
      </GridContainer>
    </SaveIndicatorProvider>
  );
}
