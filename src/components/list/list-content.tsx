import { GridView } from "./grid-view";
import { StreamView } from "./stream-view";
import { CustomButton } from "@/components/ui/custom-button";

interface ListContentProps {
  currentListId: string | null;
  viewMode: "grid" | "stream";
  listName: string;
  listsLoading: boolean;
  gridData: any[];
  columns: any[];
  onCellChange: (rowId: string, colKey: string, value: any) => void;
  onAddItem: (() => void) | null;
  setIsCreateListOpen: (isOpen: boolean) => void;
}

export function ListContent({
  currentListId,
  viewMode,
  listName,
  listsLoading,
  gridData,
  columns,
  onCellChange,
  onAddItem,
  setIsCreateListOpen
}: ListContentProps) {
  if (!currentListId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-lg font-medium text-slate-dark mb-2">
            {listsLoading ? "Loading lists..." : "No lists available"}
          </h2>
          {!listsLoading && (
            <CustomButton
              onClick={() => setIsCreateListOpen(true)}
              className="mt-2"
            >
              Create your first list
            </CustomButton>
          )}
        </div>
      </div>
    );
  }

  // Always ensure we have at least 20 empty rows to show, regardless of whether there's data or not
  const displayData = Array.from({ length: 20 }, (_, i) => {
    // If we have real data for this row index, use it
    if (gridData.length > i) {
      return gridData[i];
    }
    // Otherwise return an empty row
    return { 
      id: `empty-row-${i+1}`,
      opportunity: "",
      status: "",
      revenue: "",
      close_date: "",
      owner: "",
      company: ""
    };
  });

  return viewMode === "grid" ? (
    <GridView 
      columns={columns} 
      data={displayData} 
      listName={listName} 
      listType="Opportunity"
      listId={currentListId}
      onCellChange={onCellChange}
      onAddItem={onAddItem}
    />
  ) : (
    <StreamView 
      contacts={[]} 
      listName={listName}
      listId={currentListId}
    />
  );
}
