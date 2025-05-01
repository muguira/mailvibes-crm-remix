
import { SaveIndicatorProvider } from "./contexts/save-indicator-context";
import { GridContainer, GridViewContent } from "./components";
import { GridViewProps } from "./types";
import "./grid-view.css";

// Main GridView wrapper with providers
export function GridView(props: GridViewProps & { 
  listId?: string,
  onCellChange?: (rowId: string, colKey: string, value: any) => void,
  onAddItem?: (() => void) | null,
  onDeleteColumn?: (columnId: string) => void,
  onAddColumn?: (afterColumnId: string) => void
}) {
  return (
    <SaveIndicatorProvider>
      <GridContainer {...props}>
        <GridViewContent {...props} />
      </GridContainer>
    </SaveIndicatorProvider>
  );
}
