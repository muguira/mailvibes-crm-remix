import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { GridView } from "@/components/list/grid-view";
import { StreamView } from "@/components/list/stream-view";
import { ViewModeSelector } from "@/components/list/view-mode-selector";
import { opportunityColumns } from "@/data/opportunities-data";
import { useLists, useGridData, useContacts, useChangeHistory, useRealtimePresence } from "@/hooks/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { CustomButton } from "@/components/ui/custom-button";
import { OpportunityDialog } from "@/components/list/opportunity-dialog";
import { Plus, History, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import "@/components/list/grid-view.css";
import { v4 as uuidv4 } from "uuid";
import { ChangeRecord, PresenceUser } from "@/hooks/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

const Lists = () => {
  const [viewMode, setViewMode] = useState<"grid" | "stream">("grid");
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isAddOpportunityOpen, setIsAddOpportunityOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const { user } = useAuth();
  
  // Fetch lists
  const { lists, isLoading: listsLoading, createList } = useLists();
  
  // Fetch grid data for the current list
  const { gridData, isLoading: dataLoading, saveGridChange } = useGridData(currentListId || undefined);

  // Fetch/create contacts for the current list
  const { contacts, isLoading: contactsLoading, createContact } = useContacts(currentListId || undefined);
  
  // Get change history
  const { changes, recordChange } = useChangeHistory(currentListId || undefined);
  
  // Get realtime presence
  const { presentUsers, updateCursorPosition } = useRealtimePresence(currentListId || undefined);
  
  // Set the first list as current when lists are loaded
  useEffect(() => {
    if (lists.length > 0 && !currentListId) {
      setCurrentListId(lists[0].id);
    }
  }, [lists, currentListId]);

  // Sync contacts to grid data whenever contacts change
  useEffect(() => {
    if (contacts.length > 0 && currentListId) {
      contacts.forEach(contact => {
        // Check if this contact already exists in grid data
        const exists = gridData.some(row => row.id === contact.id);
        
        if (!exists) {
          // Create a new grid data row for this contact
          const opportunityData = {
            opportunity: contact.name || 'New Opportunity',
            company: contact.company || '',
            status: contact.status || 'New',
            revenue: contact.data?.opportunity_value || '',
            close_date: contact.data?.close_date || '',
            owner: '',
            employees: '',
            // Add any other fields from your grid columns
          };
          
          // Save each field to grid data
          Object.entries(opportunityData).forEach(([key, value]) => {
            saveGridChange({
              rowId: contact.id,
              colKey: key,
              value
            });
          });
        }
      });
    }
  }, [contacts, gridData, currentListId, saveGridChange]);

  // Handle cell changes in grid view
  const handleCellChange = (rowId: string, colKey: string, value: any) => {
    if (!currentListId || !user) return;
    
    // Get the existing value from gridData
    const row = gridData.find(r => r.id === rowId);
    const oldValue = row ? row[colKey] : null;
    
    // Save the change to grid data
    saveGridChange({
      rowId,
      colKey,
      value
    });
    
    // Record the change in history
    if (currentListId) {
      recordChange({
        list_id: currentListId,
        row_id: rowId,
        column_key: colKey,
        old_value: oldValue,
        new_value: value
      });
    }
    
    // Update cursor position for realtime presence
    updateCursorPosition(rowId, colKey);
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
      id: rowId, // Use the same ID for both contact and grid data
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

  // Format a date string for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
            
            {currentListId && (
              <>
                <CustomButton
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => setIsHistoryOpen(true)}
                >
                  <History size={14} />
                  <span>History</span>
                </CustomButton>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <CustomButton
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Users size={14} />
                      <span>Users ({Object.keys(presentUsers).length})</span>
                    </CustomButton>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h3 className="font-medium">Currently viewing</h3>
                      {Object.values(presentUsers).length === 0 ? (
                        <p className="text-sm text-slate-500">No one else is viewing this list</p>
                      ) : (
                        <div className="space-y-2">
                          {Object.values(presentUsers).map((user: PresenceUser) => (
                            <div key={user.id} className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {user.avatar_url ? (
                                  <AvatarImage src={user.avatar_url} alt={user.name} />
                                ) : null}
                                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{user.name}</span>
                              <span className="text-xs text-slate-500">
                                {formatDate(user.last_active)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>

          <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
        
        <div className="flex-1 overflow-hidden">
          {currentListId ? (
            viewMode === "grid" ? (
              <GridView 
                columns={opportunityColumns} 
                data={gridData} 
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
      
      {/* History dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Change History</DialogTitle>
          </DialogHeader>
          <div className="py-4 overflow-y-auto">
            {changes.length === 0 ? (
              <p className="text-center text-slate-500">No changes have been recorded yet</p>
            ) : (
              <div className="space-y-4">
                {changes.map((change: ChangeRecord) => (
                  <div key={change.id} className="border-b pb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{getInitials(change.user_name || '')}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{change.user_name || 'Unknown User'}</span>
                      <span className="text-xs text-slate-500">
                        {formatDate(change.changed_at)}
                      </span>
                    </div>
                    <div className="ml-8 mt-1">
                      <p className="text-sm">
                        Changed <span className="font-semibold">{change.column_key}</span> from{' '}
                        <span className="bg-red-50 px-1 rounded">{JSON.stringify(change.old_value)}</span> to{' '}
                        <span className="bg-green-50 px-1 rounded">{JSON.stringify(change.new_value)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <CustomButton onClick={() => setIsHistoryOpen(false)}>
              Close
            </CustomButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lists;
