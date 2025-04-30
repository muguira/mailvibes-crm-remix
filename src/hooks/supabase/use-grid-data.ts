
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { v4 as uuidv4 } from 'uuid';

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

      // Check if row exists
      const { data: existingData } = await supabase
        .from('grid_data')
        .select('*')
        .eq('list_id', listId)
        .eq('row_id', rowId)
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
        return data[0];
      } else {
        // Generate a unique row ID if this is a new row
        // To avoid duplicate key errors
        const uniqueRowId = rowId.startsWith('empty-row') ? uuidv4() : rowId;
        
        // Create new row
        const newRowData = { [colKey]: value };
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
        return data[0];
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grid_data', user?.id, listId] });
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
