
import { ListHeader } from "@/components/list/list-header";
import { ListContent } from "@/components/list/list-content";
import { TopNavbar } from "@/components/layout/top-navbar";
import { CreateListDialog } from "@/components/list/dialogs/create-list-dialog";
import { HistoryDialog } from "@/components/list/dialogs/history-dialog";
import { OpportunityDialog } from "@/components/list/opportunity-dialog";
import { opportunityColumns } from "@/data/opportunities-data";
import { useListsPage } from "@/components/list/hooks/use-lists-page";

const Lists = () => {
  const {
    viewMode,
    setViewMode,
    currentListId,
    setCurrentListId,
    isCreateListOpen,
    setIsCreateListOpen,
    isAddOpportunityOpen,
    setIsAddOpportunityOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    lists,
    listsLoading,
    gridData,
    changes,
    presentUsers,
    handleCellChange,
    handleCreateList,
    handleAddOpportunity,
    handleSaveOpportunity,
    currentListName
  } = useListsPage();

  return (
    <div className="flex flex-col h-screen bg-slate-light/20">
      {/* Top Navigation - Replacing the sidebar */}
      <TopNavbar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="salesiq-page-header">
          <h1 className="salesiq-title">Opportunities</h1>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 bg-teal-primary text-white rounded hover:bg-teal-primary/90 text-sm"
              onClick={() => setIsAddOpportunityOpen(true)}
            >
              Add Opportunity
            </button>
          </div>
        </div>
        
        {/* List Header with list selection and controls */}
        <ListHeader
          listsLoading={listsLoading}
          lists={lists}
          currentListId={currentListId}
          presentUsers={presentUsers}
          viewMode={viewMode}
          setCurrentListId={setCurrentListId}
          setIsCreateListOpen={setIsCreateListOpen}
          setIsHistoryOpen={setIsHistoryOpen}
          setViewMode={setViewMode}
        />
        
        {/* Full-screen list content */}
        <div className="flex-1 overflow-hidden">
          <ListContent
            currentListId={currentListId}
            viewMode={viewMode}
            listName={currentListName}
            listsLoading={listsLoading}
            gridData={gridData}
            columns={opportunityColumns}
            onCellChange={handleCellChange}
            onAddItem={handleAddOpportunity}
            setIsCreateListOpen={setIsCreateListOpen}
          />
        </div>
      </div>

      {/* Dialogs */}
      <CreateListDialog
        isOpen={isCreateListOpen}
        onClose={() => setIsCreateListOpen(false)}
        onCreateList={handleCreateList}
      />
      
      <OpportunityDialog
        isOpen={isAddOpportunityOpen}
        onClose={() => setIsAddOpportunityOpen(false)}
        onSave={handleSaveOpportunity}
        listName={currentListName}
      />
      
      <HistoryDialog
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        changes={changes}
      />
    </div>
  );
}

export default Lists;
