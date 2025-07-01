import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { Json } from "@/integrations/supabase/types";
import { withRetrySupabase } from "@/utils/supabaseRetry";
import { logger } from '@/utils/logger';

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

// Hook for contacts CRUD operations
export function useContacts(listId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchContacts = async (): Promise<Contact[]> => {
    if (!user || !listId) return [];

    const result = await withRetrySupabase(
      () => supabase
        .from('contacts')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false }),
      {
        maxAttempts: 3,
        onRetry: (error, attempt) => {
          logger.log(`Retrying contacts fetch (attempt ${attempt})...`);
        }
      }
    );

    const { data, error } = result;

    if (error) {
      logger.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts. Please try again.',
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
      // Ensure data is an object, not a string
      data: typeof item.data === 'string' ? JSON.parse(item.data) : (item.data as Record<string, any>) || {}
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
    mutationFn: async (newContact: Omit<Contact, 'last_activity'> & { id?: string }) => {
      if (!user) throw new Error('User not authenticated');
      if (!listId) throw new Error('List ID is required');

      // Use provided ID or generate a new one
      const contactId = newContact.id || crypto.randomUUID();

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          id: contactId,
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
