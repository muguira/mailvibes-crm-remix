
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { v4 as uuidv4 } from 'uuid';

// Types for lists
export interface UserList {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

// Hook for lists CRUD operations
export function useLists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchLists = async (): Promise<UserList[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lists',
        variant: 'destructive',
      });
      return [];
    }

    return data || [];
  };

  // Query to fetch lists
  const listsQuery = useQuery({
    queryKey: ['lists', user?.id],
    queryFn: fetchLists,
    enabled: !!user,
  });

  // Mutation to create a list
  const createListMutation = useMutation({
    mutationFn: async (newList: { name: string; type: string; id?: string }) => {
      if (!user) throw new Error('User not authenticated');

      const listId = newList.id || uuidv4(); // Use provided ID or generate new UUID

      // Insert with specified ID
      const { data, error } = await supabase
        .from('user_lists')
        .insert({
          id: listId,
          user_id: user.id,
          name: newList.name,
          type: newList.type,
        })
        .select();

      if (error) {
        // If the list already exists, try to update it instead
        if (error.code === '23505') { // Unique violation code
          const { data: updateData, error: updateError } = await supabase
            .from('user_lists')
            .update({
              name: newList.name,
              type: newList.type,
              updated_at: new Date().toISOString()
            })
            .eq('id', listId)
            .select();
            
          if (updateError) throw updateError;
          return updateData?.[0] || { id: listId, ...newList };
        }
        throw error;
      }
      
      return data?.[0] || { id: listId, ...newList };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', user?.id] });
      toast({
        title: 'Success',
        description: 'List created successfully',
      });
    },
    onError: (error) => {
      console.error('Failed to create list:', error);
      toast({
        title: 'Error',
        description: `Failed to create list: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to update a list
  const updateListMutation = useMutation({
    mutationFn: async (updatedList: Partial<UserList> & { id: string }) => {
      const { data, error } = await supabase
        .from('user_lists')
        .update({
          name: updatedList.name,
          type: updatedList.type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedList.id)
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', user?.id] });
      toast({
        title: 'Success',
        description: 'List updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update list: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    lists: listsQuery.data || [],
    isLoading: listsQuery.isLoading,
    isError: listsQuery.isError,
    createList: createListMutation.mutate,
    updateList: updateListMutation.mutate,
  };
}
