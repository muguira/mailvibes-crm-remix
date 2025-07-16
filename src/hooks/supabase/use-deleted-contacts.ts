import { useAuth } from '@/components/auth'
import { supabase } from '@/integrations/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '../use-toast'
import { withRetrySupabase } from '@/utils/supabaseRetry'
import { logger } from '@/utils/logger'
import { DeletedContact } from '@/types/deleted-contacts'
import { useStore } from '@/stores'

export function useDeletedContacts() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch all deleted contacts
  const fetchDeletedContacts = async (): Promise<DeletedContact[]> => {
    if (!user) return []

    const { data, error } = await withRetrySupabase(() =>
      supabase.from('deleted_contacts').select('*').eq('user_id', user.id).order('deleted_at', { ascending: false }),
    )

    if (error) {
      logger.error('Error fetching deleted contacts:', error)
      throw error
    }

    return data || []
  }

  // Query hook for deleted contacts
  const deletedContactsQuery = useQuery({
    queryKey: ['deleted_contacts', user?.id],
    queryFn: fetchDeletedContacts,
    enabled: !!user,
  })

  // Restore a deleted contact using the database function
  const restoreContactMutation = useMutation({
    mutationFn: async (contactId: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('restore_deleted_contact', {
        contact_id_param: contactId,
        user_id_param: user.id,
      })

      if (error) throw error

      if (!data || data.length === 0 || !data[0].restored) {
        throw new Error('Failed to restore contact')
      }

      // Force refresh the contacts store to reload all contacts after restoration
      const store = useStore.getState()
      await store.contactsForceRefresh()
    },
    onSuccess: (_, contactId) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['deleted_contacts', user?.id])
      queryClient.invalidateQueries(['leadsRows', user?.id])
      queryClient.invalidateQueries(['contacts', user?.id])

      toast({
        title: 'Contact Restored',
        description: 'The contact has been successfully restored.',
      })
    },
    onError: error => {
      logger.error('Error restoring contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to restore contact. Please try again.',
        variant: 'destructive',
      })
    },
  })

  // Restore multiple contacts
  const restoreMultipleContactsMutation = useMutation({
    mutationFn: async (contactIds: string[]): Promise<void> => {
      if (!user) throw new Error('User not authenticated')

      // Restore contacts one by one (we could create a batch RPC function later)
      const results = await Promise.allSettled(
        contactIds.map(contactId =>
          supabase.rpc('restore_deleted_contact', {
            contact_id_param: contactId,
            user_id_param: user.id,
          }),
        ),
      )

      const failures = results.filter(r => r.status === 'rejected')
      if (failures.length > 0) {
        throw new Error(`Failed to restore ${failures.length} contact(s)`)
      }

      // Force refresh the contacts store to reload all contacts after restoration
      const store = useStore.getState()
      await store.contactsForceRefresh()
    },
    onSuccess: (_, contactIds) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['deleted_contacts', user?.id])
      queryClient.invalidateQueries(['leadsRows', user?.id])
      queryClient.invalidateQueries(['contacts', user?.id])

      toast({
        title: 'Contacts Restored',
        description: `${contactIds.length} contact${contactIds.length !== 1 ? 's' : ''} have been successfully restored.`,
      })
    },
    onError: error => {
      logger.error('Error restoring contacts:', error)
      toast({
        title: 'Error',
        description: 'Failed to restore some contacts. Please try again.',
        variant: 'destructive',
      })
    },
  })

  // Permanently delete a contact
  const permanentlyDeleteContactMutation = useMutation({
    mutationFn: async (contactId: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase.from('deleted_contacts').delete().eq('id', contactId).eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['deleted_contacts', user?.id])

      toast({
        title: 'Contact Permanently Deleted',
        description: 'The contact has been permanently deleted.',
      })
    },
    onError: error => {
      logger.error('Error permanently deleting contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to permanently delete contact. Please try again.',
        variant: 'destructive',
      })
    },
  })

  // Permanently delete multiple contacts
  const permanentlyDeleteMultipleContactsMutation = useMutation({
    mutationFn: async (contactIds: string[]): Promise<void> => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase.from('deleted_contacts').delete().in('id', contactIds).eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['deleted_contacts', user?.id])

      toast({
        title: 'Contacts Permanently Deleted',
        description: `${variables.length} contact${variables.length !== 1 ? 's' : ''} have been permanently deleted.`,
      })
    },
    onError: error => {
      logger.error('Error permanently deleting contacts:', error)
      toast({
        title: 'Error',
        description: 'Failed to permanently delete contacts. Please try again.',
        variant: 'destructive',
      })
    },
  })

  return {
    deletedContacts: deletedContactsQuery.data || [],
    isLoading: deletedContactsQuery.isLoading,
    isError: deletedContactsQuery.isError,
    restoreContact: restoreContactMutation.mutate,
    permanentlyDeleteContact: permanentlyDeleteContactMutation.mutate,
    restoreMultipleContacts: restoreMultipleContactsMutation.mutate,
    permanentlyDeleteMultipleContacts: permanentlyDeleteMultipleContactsMutation.mutate,
    isRestoring: restoreContactMutation.isPending || restoreMultipleContactsMutation.isPending,
    isPermanentlyDeleting:
      permanentlyDeleteContactMutation.isPending || permanentlyDeleteMultipleContactsMutation.isPending,
  }
}
