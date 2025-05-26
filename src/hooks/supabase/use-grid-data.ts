// @ts-nocheck
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { v4 as uuidv4 } from 'uuid';
import { useDroppable } from "@/components/ui/use-droppable";

// Hook for grid data operations
export function useGridData(listId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchGridData = async (): Promise<{ id: string; [key: string]: any }[]> => {
    if (!user || !listId) return [];

    const { data, error } = await supabase
      .from('grid_data')
      .select('*')
      .eq('list_id', listId);

    if (error) {
      console.error('Error fetching grid data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grid data',
        variant: 'destructive',
      });
      return [];
    }

    // Convert to the format expected by the grid component
    return data.map(row => ({
      id: row.row_id,
      ...((typeof row.data === 'string' ? JSON.parse(row.data) : row.data) as Record<string, any>)
    })) || [];
  };

  // Query to fetch grid data
  const gridDataQuery = useQuery({
    queryKey: ['grid_data', user?.id, listId],
    queryFn: fetchGridData,
    enabled: !!user && !!listId,
  });

  // Mutation to save grid changes
  const saveGridChangeMutation = useMutation({
    mutationFn: async ({ rowId, colKey, value }: { rowId: string, colKey: string, value: any }) => {
      if (!user) throw new Error('User not authenticated');
      if (!listId) throw new Error('List ID is required');
      
      // Generate a unique row ID if this is a new row
      let uniqueRowId = rowId;
      if (rowId.startsWith('new-row-') || rowId.startsWith('empty-row-')) {
        uniqueRowId = uuidv4();
      }

      try {
        // Check if row exists
        const { data: existingData } = await supabase
          .from('grid_data')
          .select('*')
          .eq('list_id', listId)
          .eq('row_id', uniqueRowId)
          .maybeSingle();

        if (existingData) {
          // Update existing row
          const currentData = typeof existingData.data === 'string' 
            ? JSON.parse(existingData.data) 
            : (existingData.data as Record<string, any>) || {};
            
          const updatedData = {
            ...currentData,
            [colKey]: value
          };

          const { data, error } = await supabase
            .from('grid_data')
            .update({
              data: updatedData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingData.id)
            .select();

          if (error) throw error;
          return { data: data[0], originalRowId: rowId, newRowId: uniqueRowId };
        } else {
          // Create new row
          const newRowData = { [colKey]: value };
          
          // First check if there's another row with the same combination of list_id and row_id
          const { data: duplicateCheck } = await supabase
            .from('grid_data')
            .select('id')
            .eq('list_id', listId)
            .eq('row_id', uniqueRowId)
            .maybeSingle();
            
          // If there's a duplicate, use a new uuid
          if (duplicateCheck) {
            uniqueRowId = uuidv4();
          }
          
          const { data, error } = await supabase
            .from('grid_data')
            .insert({
              user_id: user.id,
              list_id: listId,
              row_id: uniqueRowId,
              data: newRowData
            })
            .select();

          if (error) throw error;
          return { data: data[0], originalRowId: rowId, newRowId: uniqueRowId };
        }
      } catch (error: any) {
        // Handle specific duplicate key error
        if (error.message && error.message.includes('duplicate key')) {
          // Create a new ID to retry
          const retryRowId = uuidv4();
          console.log(`Duplicate key detected, retrying with new ID: ${retryRowId}`);
          
          const newRowData = { [colKey]: value };
          const { data, error: retryError } = await supabase
            .from('grid_data')
            .insert({
              user_id: user.id,
              list_id: listId,
              row_id: retryRowId,
              data: newRowData
            })
            .select();
            
          if (retryError) throw retryError;
          return { data: data[0], originalRowId: rowId, newRowId: retryRowId };
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      // Update the grid data with the new row ID if it was changed
      if (result?.originalRowId !== result?.newRowId) {
        // Fetch fresh data since the row IDs might have changed
        queryClient.invalidateQueries({ queryKey: ['grid_data', user?.id, listId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['grid_data', user?.id, listId] });
      }
    },
    onError: (error) => {
      console.error('Error saving grid change:', error);
      toast({
        title: 'Error',
        description: `Failed to save changes: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    gridData: gridDataQuery.data || [],
    isLoading: gridDataQuery.isLoading,
    isError: gridDataQuery.isError,
    saveGridChange: saveGridChangeMutation.mutate,
  };
}
