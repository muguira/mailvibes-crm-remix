
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "./use-toast";
import { Json } from "@/integrations/supabase/types";

// Types for our data
export interface UserList {
  id: string;
  name: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  last_activity: string | null;
  data: Record<string, any>;
}

export interface GridDataRow {
  id: string;
  list_id: string;
  row_id: string;
  data: Record<string, any>;
}

export interface Activity {
  id: string;
  contact_id: string;
  type: string;
  content?: string | null;
  timestamp: string;
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
    mutationFn: async (newList: { name: string; type: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_lists')
        .insert({
          user_id: user.id,
          name: newList.name,
          type: newList.type,
        })
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists', user?.id] });
      toast({
        title: 'Success',
        description: 'List created successfully',
      });
    },
    onError: (error) => {
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

// Hook for contacts CRUD operations
export function useContacts(listId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchContacts = async (): Promise<Contact[]> => {
    if (!user || !listId) return [];

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
      return [];
    }

    // Convert Json data to proper Contact type
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      company: item.company,
      email: item.email,
      phone: item.phone,
      status: item.status,
      last_activity: item.last_activity,
      data: item.data as Record<string, any>
    }));
  };

  // Query to fetch contacts
  const contactsQuery = useQuery({
    queryKey: ['contacts', user?.id, listId],
    queryFn: fetchContacts,
    enabled: !!user && !!listId,
  });

  // Mutation to create a contact
  const createContactMutation = useMutation({
    mutationFn: async (newContact: Omit<Contact, 'id' | 'last_activity'>) => {
      if (!user) throw new Error('User not authenticated');
      if (!listId) throw new Error('List ID is required');

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          user_id: user.id,
          list_id: listId,
          name: newContact.name,
          company: newContact.company,
          email: newContact.email,
          phone: newContact.phone,
          status: newContact.status,
          data: newContact.data || {},
        })
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id, listId] });
      toast({
        title: 'Success',
        description: 'Contact created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create contact: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to update a contact
  const updateContactMutation = useMutation({
    mutationFn: async (updatedContact: { id: string; [key: string]: any }) => {
      const updateData: Record<string, any> = {};
      
      // Only include fields that are provided
      if (updatedContact.name !== undefined) updateData.name = updatedContact.name;
      if (updatedContact.company !== undefined) updateData.company = updatedContact.company;
      if (updatedContact.email !== undefined) updateData.email = updatedContact.email;
      if (updatedContact.phone !== undefined) updateData.phone = updatedContact.phone;
      if (updatedContact.status !== undefined) updateData.status = updatedContact.status;
      if (updatedContact.data !== undefined) updateData.data = updatedContact.data;
      
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', updatedContact.id)
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id, listId] });
      toast({
        title: 'Success',
        description: 'Contact updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update contact: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    contacts: contactsQuery.data || [],
    isLoading: contactsQuery.isLoading,
    isError: contactsQuery.isError,
    createContact: createContactMutation.mutate,
    updateContact: updateContactMutation.mutate,
  };
}

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
      ...(row.data as Record<string, any>)
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
        const updatedData = {
          ...(existingData.data as Record<string, any>),
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
        // Create new row
        const newRowData = { [colKey]: value };
        const { data, error } = await supabase
          .from('grid_data')
          .insert({
            user_id: user.id,
            list_id: listId,
            row_id: rowId,
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

// Hook for activities CRUD operations
export function useActivities(contactId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchActivities = async (): Promise<Activity[]> => {
    if (!user || !contactId) return [];

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('contact_id', contactId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      });
      return [];
    }

    return data || [];
  };

  // Query to fetch activities
  const activitiesQuery = useQuery({
    queryKey: ['activities', user?.id, contactId],
    queryFn: fetchActivities,
    enabled: !!user && !!contactId,
  });

  // Mutation to create an activity
  const createActivityMutation = useMutation({
    mutationFn: async (newActivity: { type: string; content?: string; }) => {
      if (!user) throw new Error('User not authenticated');
      if (!contactId) throw new Error('Contact ID is required');

      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          contact_id: contactId,
          type: newActivity.type,
          content: newActivity.content,
        })
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', user?.id, contactId] });
      toast({
        title: 'Success',
        description: 'Activity recorded successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to record activity: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    activities: activitiesQuery.data || [],
    isLoading: activitiesQuery.isLoading,
    isError: activitiesQuery.isError,
    createActivity: createActivityMutation.mutate,
  };
}
