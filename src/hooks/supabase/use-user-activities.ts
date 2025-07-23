import { useAuth } from '@/components/auth'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface UserActivity {
  id: string
  user_id: string
  user_name: string
  user_email: string | null
  timestamp: string
  activity_type: string
  entity_id?: string | null
  entity_type?: string | null
  entity_name?: string | null
  field_name?: string | null
  old_value?: any
  new_value?: any
  details?: Record<string, any> | null
  created_at: string
  stream_view?: boolean
}

export function useUserActivities() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLogging, setIsLogging] = useState(false)

  // Fetch user activities when user signs in
  useEffect(() => {
    if (user) {
      fetchActivities()
    } else {
      setActivities([])
      setIsLoading(false)
    }
  }, [user?.id])

  // Fetch activities from Supabase
  const fetchActivities = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error) throw error

      // 🚫 FILTER OUT: Exclude any sync-related activities that should NEVER appear
      const filteredData = (data || []).filter((item: any) => {
        // Check if the activity contains sync-related content that should be hidden
        const content = item.new_value || item.details || ''
        const contentStr = typeof content === 'string' ? content.toLowerCase() : JSON.stringify(content).toLowerCase()

        // NEVER show these activities
        const bannedPhrases = [
          'performed email sync action',
          'email sync action',
          'sync action',
          'gmail sync',
          'email synchronization',
          'sync emails',
          'synchronizing emails',
        ]

        // If the activity contains any banned phrase, exclude it
        const shouldExclude = bannedPhrases.some(phrase => contentStr.includes(phrase))

        if (shouldExclude) {
          console.debug(`[UserActivities] Filtering out sync activity: ${contentStr.substring(0, 50)}...`)
        }

        return !shouldExclude
      })

      setActivities(filteredData as UserActivity[])
    } catch (error) {
      logger.error('Error fetching user activities:', error)
      toast({
        title: 'Error',
        description: 'Failed to load activity history',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Log activity to Supabase
  const logActivity = async (
    activityData: Omit<UserActivity, 'id' | 'user_id' | 'user_name' | 'user_email' | 'timestamp' | 'created_at'>,
  ) => {
    if (!user) return false

    setIsLogging(true)

    try {
      const newActivity = {
        id: uuidv4(),
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        user_email: user.email || null,
        timestamp: new Date().toISOString(),
        ...activityData,
      }

      // Optimistically update UI
      setActivities(prev => [newActivity as UserActivity, ...prev])

      // Save to Supabase
      const { error } = await supabase.from('user_activities').insert(newActivity)

      if (error) throw error

      return true
    } catch (error) {
      logger.error('Error logging activity:', error)
      // Remove optimistically added activity
      setActivities(prev => prev.filter(a => a.id !== uuidv4()))
      return false
    } finally {
      setIsLogging(false)
    }
  }

  // Helper functions for common activity types
  const logCellEdit = async (entityId: string, fieldName: string, newValue: any, oldValue: any) => {
    return logActivity({
      activity_type: 'cell_edit',
      entity_id: entityId,
      entity_type: 'contact',
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
    })
  }

  const logContactAdd = async (entityId: string, contactName: string) => {
    return logActivity({
      activity_type: 'contact_add',
      entity_id: entityId,
      entity_type: 'contact',
      entity_name: contactName,
    })
  }

  const logContactUpdate = async (
    entityId: string,
    contactName: string,
    fieldName: string,
    oldValue: any,
    newValue: any,
  ) => {
    return logActivity({
      activity_type: 'contact_update',
      entity_id: entityId,
      entity_type: 'contact',
      entity_name: contactName,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
    })
  }

  const logLogin = async () => {
    return logActivity({
      activity_type: 'login',
    })
  }

  const logLogout = async () => {
    return logActivity({
      activity_type: 'logout',
    })
  }

  return {
    activities,
    isLoading,
    isLogging,
    fetchActivities,
    logCellEdit,
    logContactAdd,
    logContactUpdate,
    logLogin,
    logLogout,
    logActivity,
  }
}
