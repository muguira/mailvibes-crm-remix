
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

  // Create a more compact display data without extra spacing
  const displayData = gridData.length > 0 ? 
    gridData.map((item, index) => ({
      ...item,
      id: item.id || `row-${index+1}`
    })) : 
    Array(10).fill(null).map((_, index) => ({
      id: `empty-row-${index+1}`,
      opportunity: "",
      status: "",
      revenue: "",
      close_date: "",
      owner: "",
      company: ""
    }));

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
