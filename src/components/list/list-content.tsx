
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
  onAddItem: () => void;
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
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center max-w-md p-8 border border-slate-light/20 rounded-lg shadow-sm">
          <h2 className="text-xl font-medium text-slate-dark mb-4">
            {listsLoading ? "Loading lists..." : "No lists available"}
          </h2>
          <p className="text-slate-medium mb-6">
            Lists are the backbone of your workflow and house all the data you want to track.
            The grid looks and acts similarly to a spreadsheet.
          </p>
          {!listsLoading && (
            <CustomButton
              onClick={() => setIsCreateListOpen(true)}
              className="mt-2 bg-salesforce-mint hover:bg-salesforce-dark"
            >
              Create your first list
            </CustomButton>
          )}
        </div>
      </div>
    );
  }

  return viewMode === "grid" ? (
    <GridView 
      columns={columns} 
      data={gridData} 
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
