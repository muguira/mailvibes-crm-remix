// @ts-nocheck
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { v4 as uuidv4 } from 'uuid';
import { GridRow } from "@/components/grid-view/types";
import { LEADS_STORAGE_KEY } from "@/constants/grid";
import { generateDummyLeads } from "@/components/stream/sample-data";

/**
 * Hook for managing lead rows with Supabase persistence
 * Falls back to localStorage when not authenticated
 */
export function useLeadsRows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Load data from Supabase
  const fetchLeadsRows = async (): Promise<GridRow[]> => {
    if (!user) {
      // Fall back to localStorage if not authenticated
      return loadFromLocalStorage();
    }

    try {
      const { data, error } = await supabase
        .from('leads_rows')
        .select('*')
        .order('row_id')
        .eq('user_id', user.id);

      if (error) {
        // Check if the error is due to the table not existing
        if (error.code === '42P01') { // PostgreSQL error code for "relation does not exist"
          console.log("Table doesn't exist yet, using local data");
          return loadFromLocalStorage();
        }
        throw error;
      }

      // If we got an empty array, it might be first time use, so use localStorage
      if (!data || data.length === 0) {
        return loadFromLocalStorage();
      }

      // Transform data to expected GridRow format
      return data.map(row => ({
        id: row.row_id,
        ...(typeof row.data === 'string' ? JSON.parse(row.data) : row.data)
      }));
    } catch (error) {
      console.error('Error fetching leads rows:', error);
      
      // Don't show the error toast during fetch - it's annoying on initial load
      // Only show error toasts for write operations
      
      // Fall back to localStorage on error
      return loadFromLocalStorage();
    }
  };

  // Helper to load from localStorage
  const loadFromLocalStorage = (): GridRow[] => {
    try {
      const savedRows = localStorage.getItem(LEADS_STORAGE_KEY);
      if (savedRows) {
        const parsedRows = JSON.parse(savedRows);
        if (Array.isArray(parsedRows) && parsedRows.length > 0) {
          return parsedRows;
        }
      }
    } catch (error) {
      console.error('Failed to load rows from localStorage:', error);
    }
    
    // Generate dummy data if nothing in localStorage
    const dummyLeads = generateDummyLeads();
    
    // Convert to GridRow format
    const dummyRows = dummyLeads.map(lead => ({
      id: lead.id,
      opportunity: lead.name,
      status: lead.status || ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'][Math.floor(Math.random() * 5)],
      revenue: lead.revenue || Math.floor(Math.random() * 100000),
      closeDate: lead.closeDate || new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner: lead.owner || lead.name?.split(' ')[0] || '',
      website: lead.website || 'https://example.com',
      companyName: lead.company || `Company ${lead.id.split('-')[1]}`,
      linkedIn: 'https://linkedin.com/company/example',
      employees: lead.employees || Math.floor(Math.random() * 1000),
      lastContacted: lead.lastContacted || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      email: lead.email,
    }));
    
    // Save to localStorage as fallback
    try {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(dummyRows));
    } catch (error) {
      console.error('Failed to save initial rows to localStorage:', error);
    }
    
    return dummyRows;
  };

  // Query to fetch lead rows
  const leadsRowsQuery = useQuery({
    queryKey: ['leads_rows', user?.id],
    queryFn: fetchLeadsRows,
    staleTime: 1000 * 60, // 1 minute
  });

  // Mutation to upsert a row
  const upsertRowMutation = useMutation({
    mutationFn: async (row: GridRow) => {
      if (!user) {
        // If not authenticated, update localStorage
        const currentRows = loadFromLocalStorage();
        const updatedRows = currentRows.map(r => r.id === row.id ? row : r);
        
        // If the row doesn't exist, add it
        if (!currentRows.some(r => r.id === row.id)) {
          updatedRows.push(row);
        }
        
        localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedRows));
        return row;
      }

      try {
        // Check if the row exists
        const { data: existingRow } = await supabase
          .from('leads_rows')
          .select('*')
          .eq('user_id', user.id)
          .eq('row_id', row.id)
          .maybeSingle();

        if (existingRow) {
          // Update existing row
          const { error } = await supabase
            .from('leads_rows')
            .update({
              data: row,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('row_id', row.id);

          if (error) throw error;
        } else {
          // Insert new row
          const { error } = await supabase
            .from('leads_rows')
            .insert({
              user_id: user.id,
              row_id: row.id,
              data: row,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (error) throw error;
        }
        
        return row;
      } catch (error) {
        console.error('Error upserting lead row:', error);
        toast({
          title: 'Save Error',
          description: 'Failed to save your changes. Using offline storage.',
          variant: 'destructive',
        });
        
        // Fall back to localStorage on error
        const currentRows = loadFromLocalStorage();
        const updatedRows = currentRows.map(r => r.id === row.id ? row : r);
        
        // If the row doesn't exist, add it
        if (!currentRows.some(r => r.id === row.id)) {
          updatedRows.push(row);
        }
        
        localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedRows));
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['leads_rows', user?.id] });
    }
  });

  // Update a specific cell in a row
  const updateCellMutation = useMutation({
    mutationFn: async ({ rowId, columnId, value }: { rowId: string; columnId: string; value: any }) => {
      if (!user) {
        // If not authenticated, update localStorage
        const currentRows = loadFromLocalStorage();
        const rowIndex = currentRows.findIndex(r => r.id === rowId);
        
        if (rowIndex >= 0) {
          const updatedRow = { 
            ...currentRows[rowIndex], 
            [columnId]: value 
          };
          
          const updatedRows = [
            ...currentRows.slice(0, rowIndex),
            updatedRow,
            ...currentRows.slice(rowIndex + 1)
          ];
          
          localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedRows));
          return updatedRow;
        }
        
        throw new Error(`Row with ID ${rowId} not found in local storage`);
      }

      try {
        // First get the current row data
        const { data: existingRow } = await supabase
          .from('leads_rows')
          .select('*')
          .eq('user_id', user.id)
          .eq('row_id', rowId)
          .maybeSingle();

        if (existingRow) {
          // Update existing row's specific column
          const currentData = typeof existingRow.data === 'string' 
            ? JSON.parse(existingRow.data) 
            : existingRow.data || {};
            
          const updatedData = {
            ...currentData,
            [columnId]: value
          };

          // Use row_id and user_id for the update condition, not the database id
          const { error } = await supabase
            .from('leads_rows')
            .update({
              data: updatedData,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('row_id', rowId);

          if (error) throw error;
          
          return { 
            id: rowId, 
            ...updatedData 
          };
        } else {
          // Row doesn't exist yet, create it
          const newRowData = { 
            id: rowId,
            [columnId]: value 
          };
          
          const { error } = await supabase
            .from('leads_rows')
            .insert({
              user_id: user.id,
              row_id: rowId,
              data: newRowData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (error) throw error;
          
          return newRowData;
        }
      } catch (error) {
        console.error('Error updating cell:', error);
        
        // Fall back to localStorage on error without showing error toast
        const currentRows = loadFromLocalStorage();
        const rowIndex = currentRows.findIndex(r => r.id === rowId);
        
        if (rowIndex >= 0) {
          const updatedRow = { 
            ...currentRows[rowIndex], 
            [columnId]: value 
          };
          
          const updatedRows = [
            ...currentRows.slice(0, rowIndex),
            updatedRow,
            ...currentRows.slice(rowIndex + 1)
          ];
          
          localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updatedRows));
          return updatedRow;
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['leads_rows', user?.id] });
    }
  });

  return {
    rows: leadsRowsQuery.data || [],
    isLoading: leadsRowsQuery.isLoading,
    isError: leadsRowsQuery.isError,
    upsertRow: upsertRowMutation.mutate,
    updateCell: updateCellMutation.mutate,
  };
} 