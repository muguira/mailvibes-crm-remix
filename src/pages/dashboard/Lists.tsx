import React, { useEffect } from "react";
import { ListHeader } from "@/components/list/list-header";
import { ListContent } from "@/components/list/list-content";
import { TopNavbar } from "@/components/layout/top-navbar";
import { CreateListDialog } from "@/components/list/dialogs/create-list-dialog";
import { HistoryDialog } from "@/components/list/dialogs/history-dialog";
import { OpportunityDialog } from "@/components/list/opportunity-dialog";
import { opportunityColumns } from "@/data/opportunities-data";
import { useListsPage } from "@/components/list/hooks/use-lists-page";
import { useSearchParams } from "react-router-dom";

const Lists = () => {
  const [searchParams] = useSearchParams();
  const listIdFromUrl = searchParams.get('listId');
  
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

  // Set the list ID from URL parameter when it's available
  useEffect(() => {
    if (listIdFromUrl && lists.length > 0) {
      // Check if the list exists
      const listExists = lists.some(list => list.id === listIdFromUrl);
      if (listExists) {
        setCurrentListId(listIdFromUrl);
      }
    }
  }, [listIdFromUrl, lists, setCurrentListId]);

  return (
    <div className="flex flex-col h-screen bg-slate-light/20">
      {/* Top Navigation */}
      <TopNavbar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
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
          setIsAddOpportunityOpen={setIsAddOpportunityOpen}
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
            onAddItem={null}
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
