// @ts-nocheck
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { v4 as uuidv4 } from 'uuid';
import { useDroppable } from "@/components/ui/use-droppable";
import { withRetrySupabase, withRetry } from "@/utils/supabaseRetry";

// Hook for grid data operations
export function useGridData(listId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchGridData = async (): Promise<{ id: string; [key: string]: any }[]> => {
    if (!user || !listId) return [];

    const result = await withRetrySupabase(
      () => supabase
        .from('grid_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('list_id', listId),
      {
        maxAttempts: 3,
        onRetry: (error, attempt) => {
          console.log(`Retrying grid data fetch (attempt ${attempt})...`);
        }
      }
    );

    const { data, error } = result;

    if (error) {
      console.error('Error fetching grid data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grid data. Please try again.',
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
      if (!user || !listId) throw new Error('User or list not available');

      return await withRetry(
        async () => {
          let uniqueRowId = rowId;

          // Check if row exists
          const { data: existingRow, error: fetchError } = await supabase
            .from('grid_data')
            .select('id, data')
            .eq('user_id', user.id)
            .eq('list_id', listId)
            .eq('row_id', rowId)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (existingRow) {
            // Update existing row
            const updatedData = {
              ...existingRow.data,
              [colKey]: value
            };

            const { data, error } = await supabase
              .from('grid_data')
              .update({ data: updatedData })
              .eq('id', existingRow.id)
              .select();

            if (error) throw error;
            return { data: data[0], originalRowId: rowId, newRowId: rowId };
          } else {
            // Create new row with retry for duplicate key errors
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
        },
        {
          maxAttempts: 3,
          shouldRetry: (error: any) => {
            // Retry on duplicate key errors
            return error?.message?.includes('duplicate key');
          },
          onRetry: (error, attempt) => {
            console.log(`Retrying grid save due to duplicate key (attempt ${attempt})...`);
          }
        }
      );
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
        description: `Failed to save changes. Please try again.`,
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
