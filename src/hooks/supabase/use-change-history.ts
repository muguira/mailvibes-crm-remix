
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";

export interface ChangeRecord {
  id: string;
  list_id: string;
  row_id: string;
  column_key: string;
  old_value: any;
  new_value: any;
  changed_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
}

export function useChangeHistory(listId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchChangeHistory = async (): Promise<ChangeRecord[]> => {
    if (!user || !listId) return [];

    // Fetch change history records for this list
    const { data, error } = await supabase
      .from('grid_change_history')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('list_id', listId)
      .order('changed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching change history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load change history',
        variant: 'destructive',
      });
      return [];
    }

    // Transform the data to include user information
    return (data || []).map(record => ({
      ...record,
      user_name: record.profiles ? 
        `${record.profiles.first_name || ''} ${record.profiles.last_name || ''}`.trim() || 'Unknown User' : 
        'Unknown User',
    }));
  };

  // Query to fetch change history
  const changeHistoryQuery = useQuery({
    queryKey: ['change_history', listId],
    queryFn: fetchChangeHistory,
    enabled: !!user && !!listId,
  });

  // Record a change in the history
  const recordChangeMutation = useMutation({
    mutationFn: async (change: {
      list_id: string;
      row_id: string;
      column_key: string;
      old_value: any;
      new_value: any;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('grid_change_history')
        .insert({
          list_id: change.list_id,
          row_id: change.row_id,
          column_key: change.column_key,
          old_value: change.old_value,
          new_value: change.new_value,
          user_id: user.id,
          changed_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['change_history', listId] });
    },
    onError: (error) => {
      console.error('Error recording change:', error);
      // Silent failure - we don't want to disrupt the user experience
      // for change history recording failures
    },
  });

  return {
    changes: changeHistoryQuery.data || [],
    isLoading: changeHistoryQuery.isLoading,
    isError: changeHistoryQuery.isError,
    recordChange: recordChangeMutation.mutate,
  };
}
