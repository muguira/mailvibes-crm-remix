
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ListHeader } from "@/components/list/list-header";
import { ListContent } from "@/components/list/list-content";
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
    <div className="flex h-screen bg-slate-light/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
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
};

export default Lists;
