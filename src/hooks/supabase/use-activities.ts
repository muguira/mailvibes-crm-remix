// @ts-nocheck
import { useAuth } from '@/components/auth'
import { supabase } from '@/integrations/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '../use-toast'
import { logger } from '@/utils/logger'

export interface Activity {
  id: string
  contact_id: string
  type: string
  content?: string | null
  timestamp: string
  is_pinned?: boolean
  details?: any | null
}

// Hook for activities CRUD operations
export function useActivities(contactId?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const fetchActivities = async (): Promise<Activity[]> => {
    if (!user || !contactId) return []

    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('entity_id', contactId)
      .eq('entity_type', 'contact')
      .in('activity_type', ['note_add', 'email_sent', 'email', 'call', 'meeting'])
      .order('is_pinned', { ascending: false })
      .order('timestamp', { ascending: false })

    if (error) {
      logger.error('Error fetching activities:', error)
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      })
      return []
    }

    // Transform user_activities to match Activity interface
    const activities = (data || []).map((item: any) => {
      let content = null
      try {
        if (item.new_value) {
          // For note_add activities, new_value should be stored as plain string
          if (item.activity_type === 'note_add') {
            content = item.new_value
          } else {
            // For other activities, try to parse JSON if it's a string
            content =
              typeof item.new_value === 'string'
                ? item.new_value.startsWith('{') || item.new_value.startsWith('[')
                  ? JSON.parse(item.new_value)
                  : item.new_value
                : item.new_value
          }
        } else if (item.details) {
          const details = typeof item.details === 'string' ? JSON.parse(item.details) : item.details
          content = details.content || null
        }
      } catch (e) {
        logger.error('Error parsing activity content:', e)
        content = item.new_value || null
      }

      const activity = {
        id: item.id,
        contact_id: item.entity_id,
        type: item.activity_type === 'note_add' ? 'note' : item.activity_type,
        content,
        timestamp: item.timestamp,
        is_pinned: item.is_pinned || false,
      }

      // Log activity details for debugging
      console.log('📋 Activity loaded:', {
        id: activity.id,
        type: activity.type,
        is_pinned: activity.is_pinned,
        user_id: item.user_id,
        content: activity.content?.substring(0, 30) + '...',
      })

      return activity
    })

    return activities
  }

  // Query to fetch activities
  const activitiesQuery = useQuery({
    queryKey: ['activities', user?.id, contactId],
    queryFn: fetchActivities,
    enabled: !!user && !!contactId,
  })

  // Mutation to toggle pin status
  const togglePinMutation = useMutation({
    mutationFn: async ({ activityId, isPinned }: { activityId: string; isPinned: boolean }) => {
      if (!user) throw new Error('User not authenticated')

      console.log('🔍 Attempting to update pin status:', {
        activityId,
        isPinned,
        userId: user.id,
      })

      // First, let's check if the activity exists
      const { data: existingActivity, error: checkError } = await supabase
        .from('user_activities')
        .select('id, user_id, is_pinned')
        .eq('id', activityId)
        .single()

      console.log('🔍 Activity check result:', {
        existingActivity,
        checkError,
      })

      if (checkError || !existingActivity) {
        throw new Error(`Activity not found: ${activityId}`)
      }

      // Log the current pin status vs what we're trying to set
      console.log('🔍 Pin status comparison:', {
        activityId,
        currentPinned: existingActivity.is_pinned,
        targetPinned: isPinned,
        needsUpdate: existingActivity.is_pinned !== isPinned,
      })

      // Skip update if already at target state
      if (existingActivity.is_pinned === isPinned) {
        console.log('⚠️ Activity already at target pin state, skipping update')
        return existingActivity
      }

      // Now update the pin status
      const { data, error } = await supabase
        .from('user_activities')
        .update({ is_pinned: isPinned })
        .eq('id', activityId)
        .eq('user_id', user.id) // Ensure user can only pin their own activities
        .select()

      console.log('📊 Pin update result:', {
        data,
        error,
        affectedRows: data?.length,
      })

      if (error) throw error
      return data[0]
    },
    onSuccess: (_, variables) => {
      // Invalidate multiple related queries to ensure UI updates
      queryClient.invalidateQueries({
        queryKey: ['activities', user?.id, contactId],
      })
      queryClient.invalidateQueries({
        queryKey: ['user_activities', user?.id],
      })

      // Force refetch to ensure immediate UI update
      queryClient.refetchQueries({
        queryKey: ['activities', user?.id, contactId],
      })

      toast({
        title: 'Success',
        description: variables.isPinned ? 'Activity pinned' : 'Activity unpinned',
      })
    },
    onError: error => {
      toast({
        title: 'Error',
        description: `Failed to update pin status: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  // Mutation to create an activity
  const createActivityMutation = useMutation({
    mutationFn: async (newActivity: { type: string; content?: string; timestamp?: string }) => {
      if (!user) throw new Error('User not authenticated')
      if (!contactId) throw new Error('Contact ID is required')

      // Map types for database storage
      let activityType = newActivity.type
      if (newActivity.type === 'note') {
        activityType = 'note_add'
      } else if (newActivity.type === 'email_sent') {
        activityType = 'email_sent'
      }

      const { data, error } = await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          user_name: user.email?.split('@')[0] || 'User',
          user_email: user.email,
          activity_type: activityType,
          entity_id: contactId,
          entity_type: 'contact',
          entity_name: '',
          new_value: newActivity.content || null, // Store as string directly
          timestamp: newActivity.timestamp || new Date().toISOString(),
        })
        .select()

      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['activities', user?.id, contactId],
      })
      // Also invalidate user activities
      queryClient.invalidateQueries({
        queryKey: ['user_activities', user?.id],
      })
      toast({
        title: 'Success',
        description: 'Activity recorded successfully',
      })
    },
    onError: error => {
      toast({
        title: 'Error',
        description: `Failed to record activity: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  // Mutation to edit an activity
  const editActivityMutation = useMutation({
    mutationFn: async ({ activityId, content }: { activityId: string; content: string }) => {
      if (!user) throw new Error('User not authenticated')

      console.log('🔍 Attempting to edit activity:', {
        activityId,
        content: content.substring(0, 50) + '...',
        userId: user.id,
      })

      const { data, error } = await supabase
        .from('user_activities')
        .update({
          new_value: content,
        })
        .eq('id', activityId)
        .eq('user_id', user.id) // Ensure user can only edit their own activities
        .select()

      console.log('📊 Edit activity result:', {
        data,
        error,
        affectedRows: data?.length,
      })

      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['activities', user?.id, contactId],
      })
      queryClient.invalidateQueries({
        queryKey: ['user_activities', user?.id],
      })

      toast({
        title: 'Success',
        description: 'Activity updated successfully',
      })
    },
    onError: error => {
      toast({
        title: 'Error',
        description: `Failed to update activity: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  // Mutation to delete an activity
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user) throw new Error('User not authenticated')

      console.log('🔍 Attempting to delete activity:', {
        activityId,
        userId: user.id,
      })

      const { data, error } = await supabase
        .from('user_activities')
        .delete()
        .eq('id', activityId)
        .eq('user_id', user.id) // Ensure user can only delete their own activities
        .select()

      console.log('📊 Delete activity result:', {
        data,
        error,
        affectedRows: data?.length,
      })

      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['activities', user?.id, contactId],
      })
      queryClient.invalidateQueries({
        queryKey: ['user_activities', user?.id],
      })

      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      })
    },
    onError: error => {
      toast({
        title: 'Error',
        description: `Failed to delete activity: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  return {
    activities: activitiesQuery.data || [],
    isLoading: activitiesQuery.isLoading,
    isError: activitiesQuery.isError,
    createActivity: createActivityMutation.mutate,
    editActivity: editActivityMutation.mutate,
    deleteActivity: deleteActivityMutation.mutate,
    togglePin: togglePinMutation.mutate,
  }
}
