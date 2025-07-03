
import { useState, useEffect } from "react";
import { useLists, useGridData, useContacts, useChangeHistory, useRealtimePresence } from "@/hooks/supabase";
import { useAuth } from "@/components/auth";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";

export function useListsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "stream">("grid");
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [isAddOpportunityOpen, setIsAddOpportunityOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
  const handleCreateList = (newListName: string) => {
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

  // Get the current list name
  const currentListName = lists.find(l => l.id === currentListId)?.name || "Opportunities";

  return {
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
    dataLoading,
    contacts,
    contactsLoading,
    changes,
    presentUsers,
    handleCellChange,
    handleCreateList,
    handleAddOpportunity,
    handleSaveOpportunity,
    currentListName
  };
}
