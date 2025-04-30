
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { GridView } from "@/components/list/grid-view";
import { StreamView } from "@/components/list/stream-view";
import { ViewModeSelector } from "@/components/list/view-mode-selector";
import { opportunityColumns } from "@/data/opportunities-data";
import { useLists, useGridData, useContacts } from "@/hooks/use-supabase-data";
import { useAuth } from "@/contexts/AuthContext";
import { CustomButton } from "@/components/ui/custom-button";
import { OpportunityDialog } from "@/components/list/opportunity-dialog";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import "@/components/list/grid-view.css";
import { v4 as uuidv4 } from "uuid";

const Lists = () => {
  const [viewMode, setViewMode] = useState<"grid" | "stream">("grid");
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isAddOpportunityOpen, setIsAddOpportunityOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const { user } = useAuth();
  
  // Fetch lists
  const { lists, isLoading: listsLoading, createList } = useLists();
  
  // Fetch grid data for the current list
  const { gridData, isLoading: dataLoading, saveGridChange } = useGridData(currentListId || undefined);

  // Fetch/create contacts for the current list
  const { contacts, createContact } = useContacts(currentListId || undefined);
  
  // Set the first list as current when lists are loaded
  useEffect(() => {
    if (lists.length > 0 && !currentListId) {
      setCurrentListId(lists[0].id);
    }
  }, [lists, currentListId]);

  // Handle cell changes in grid view
  const handleCellChange = (rowId: string, colKey: string, value: any) => {
    if (!currentListId || !user) return;
    
    saveGridChange({
      rowId,
      colKey,
      value
    });
  };

  // Create a new list
  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a list name",
        variant: "destructive",
      });
      return;
    }

    createList({
      name: newListName,
      type: "opportunity", // Default type
    });

    setNewListName("");
    setIsCreateListOpen(false);
  };

  // Handle adding a new opportunity
  const handleAddOpportunity = () => {
    if (!currentListId) {
      toast({
        title: "Error",
        description: "Please select a list first",
        variant: "destructive",
      });
      return;
    }
    
    setIsAddOpportunityOpen(true);
  };

  // Save new opportunity
  const handleSaveOpportunity = (data: { name: string; company: string; website?: string }) => {
    if (!currentListId) return;
    
    // Generate a unique row ID for the grid data
    const rowId = uuidv4();
    
    // Create a new contact for the opportunity
    createContact({
      name: data.name,
      company: data.company,
      email: "",
      phone: "",
      status: "New",
      data: {
        company_website: data.website || "",
        opportunity_value: "",
        close_date: "",
        status: "New"
      },
    });
    
    // Close the dialog
    setIsAddOpportunityOpen(false);
    
    toast({
      title: "Success",
      description: "Opportunity added successfully",
    });
  };

  return (
    <div className="flex h-screen bg-slate-light/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="bg-white border-b border-slate-light/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {listsLoading ? (
              <div>Loading lists...</div>
            ) : lists.length > 0 ? (
              <select 
                className="px-3 py-2 border border-slate-light/30 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-primary"
                value={currentListId || ""}
                onChange={(e) => setCurrentListId(e.target.value)}
              >
                {lists.map(list => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </select>
            ) : (
              <div>No lists available</div>
            )}
            
            <CustomButton
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setIsCreateListOpen(true)}
            >
              <Plus size={14} />
              <span>New List</span>
            </CustomButton>
          </div>

          <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
        
        <div className="flex-1 overflow-hidden">
          {currentListId ? (
            viewMode === "grid" ? (
              <GridView 
                columns={opportunityColumns} 
                data={gridData as { id: string; [key: string]: any }[]} 
                listName={lists.find(l => l.id === currentListId)?.name || "Opportunities"} 
                listType="Opportunity"
                onCellChange={handleCellChange}
                onAddItem={handleAddOpportunity}
              />
            ) : (
              <StreamView 
                contacts={[]} 
                listName={lists.find(l => l.id === currentListId)?.name || "Opportunities"}
                listId={currentListId}
              />
            )
          ) : (
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
          )}
        </div>
      </div>

      {/* Create list dialog */}
      <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-dark">
                  List Name
                </label>
                <input
                  id="name"
                  type="text" 
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                  placeholder="Enter list name"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <CustomButton
              variant="outline"
              onClick={() => setIsCreateListOpen(false)}
            >
              Cancel
            </CustomButton>
            <CustomButton onClick={handleCreateList}>
              Create List
            </CustomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add opportunity dialog */}
      <OpportunityDialog
        isOpen={isAddOpportunityOpen}
        onClose={() => setIsAddOpportunityOpen(false)}
        onSave={handleSaveOpportunity}
        listName={lists.find(l => l.id === currentListId)?.name || "DEMO"}
      />
    </div>
  );
};

export default Lists;
