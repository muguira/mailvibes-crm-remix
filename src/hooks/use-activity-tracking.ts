import { useAuth } from '@/components/auth'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface ActivityItem {
  id: string
  userId: string
  userName: string
  userEmail: string
  timestamp: string
  activityType:
    | 'cell_edit'
    | 'contact_add'
    | 'filter_change'
    | 'column_add'
    | 'column_delete'
    | 'note_add'
    | 'login'
    | 'email'
    | 'call'
    | 'meeting'
    | 'task'
    | 'status_update'
    | 'system'
  entityId?: string
  entityType?: 'contact' | 'lead' | 'column' | 'filter'
  entityName?: string
  fieldName?: string
  oldValue?: any
  newValue?: any
  details?: Record<string, any>
  // Enhanced for team functionality
  organizationId?: string
  activityScope?: 'personal' | 'team' | 'public'
  isTeamVisible?: boolean
}

// Local storage key for activity items when offline
const ACTIVITY_STORAGE_KEY = 'crm-activity-log'

export function useActivityTracking() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load activities on mount and when user changes
  useEffect(() => {
    fetchActivities()
  }, [user?.id])

  // Fetch activities from Supabase or localStorage
  const fetchActivities = async () => {
    setIsLoading(true)

    if (!user) {
      // Not logged in, use localStorage
      const localActivities = loadFromLocalStorage()
      setActivities(localActivities)
      setIsLoading(false)
      return
    }

    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error) throw error

      // Map database fields to ActivityItem interface
      const mappedActivities = (data || []).map(
        (item: any): ActivityItem => ({
          id: item.id,
          userId: item.user_id,
          userName: item.user_name,
          userEmail: item.user_email || '',
          timestamp: item.timestamp,
          activityType: item.activity_type,
          entityId: item.entity_id,
          entityType: item.entity_type,
          entityName: item.entity_name,
          fieldName: item.field_name,
          oldValue: item.old_value ? JSON.parse(item.old_value) : undefined,
          newValue: item.new_value ? JSON.parse(item.new_value) : undefined,
          details: item.details ? JSON.parse(item.details) : undefined,
          organizationId: item.organization_id,
          activityScope: item.activity_scope || 'personal',
          isTeamVisible: item.activity_scope === 'team' || item.activity_scope === 'public',
        }),
      )

      setActivities(mappedActivities)
    } catch (error) {
      logger.error('Error fetching activities:', error)
      // Fall back to localStorage
      const localActivities = loadFromLocalStorage()
      setActivities(localActivities)
    } finally {
      setIsLoading(false)
    }
  }

  // Helper to load from localStorage
  const loadFromLocalStorage = (): ActivityItem[] => {
    try {
      const saved = localStorage.getItem(ACTIVITY_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      logger.error('Failed to load activities from localStorage:', error)
      return []
    }
  }

  // Log a new activity with enhanced team support
  const logActivity = async (
    activity: Omit<ActivityItem, 'id' | 'userId' | 'userName' | 'userEmail' | 'timestamp'>,
  ) => {
    if (!user) {
      return // Don't log when not logged in
    }

    // Create new activity object
    const newActivity: ActivityItem = {
      id: uuidv4(),
      userId: user.id,
      userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      userEmail: user.email || '',
      timestamp: new Date().toISOString(),
      ...activity,
    }

    // Update local state immediately for UI feedback
    setActivities(prev => [newActivity, ...prev].slice(0, 100))

    // Store in localStorage as backup
    const localActivities = loadFromLocalStorage()
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify([newActivity, ...localActivities].slice(0, 100)))

    // Enhanced Supabase activity logging with team support
    try {
      // Store in Supabase if logged in
      if (user) {
        // Get the ID mapping to ensure we have the correct database IDs
        const idMapping = JSON.parse(localStorage.getItem('id-mapping') || '{}')

        // If entityId exists and has a mapping, use the mapped ID
        let entityId = activity.entityId
        if (entityId && idMapping[entityId]) {
          entityId = idMapping[entityId]
        }

        // Get user's organization for team activities
        let organizationId = activity.organizationId
        if (!organizationId && activity.activityScope === 'team') {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('current_organization_id')
              .eq('id', user.id)
              .single()

            if (profile?.current_organization_id) {
              organizationId = profile.current_organization_id
            }
          } catch (error) {
            logger.warn('Could not fetch organization for team activity:', error)
          }
        }

        // Format the activity for Supabase
        const supabaseActivity = {
          id: newActivity.id,
          user_id: newActivity.userId,
          user_name: newActivity.userName,
          user_email: newActivity.userEmail || null,
          timestamp: newActivity.timestamp,
          activity_type: newActivity.activityType,
          entity_id: entityId || null,
          entity_type: newActivity.entityType || null,
          entity_name: newActivity.entityName || null,
          field_name: newActivity.fieldName || null,
          old_value: newActivity.oldValue ? JSON.stringify(newActivity.oldValue) : null,
          new_value: newActivity.newValue ? JSON.stringify(newActivity.newValue) : null,
          details: newActivity.details ? JSON.stringify(newActivity.details) : null,
          // Enhanced team fields
          organization_id: organizationId || null,
          activity_scope: activity.activityScope || 'personal',
        }

        logger.log('Logging enhanced activity to Supabase:', supabaseActivity)

        const { error } = await supabase.from('user_activities').upsert(supabaseActivity, { onConflict: 'id' })

        if (error) {
          logger.error('Error logging activity to Supabase:', error)
          // Don't throw the error - we still have the activity in local state
        }
      }
    } catch (error) {
      logger.error('Error logging activity:', error)
      // Activity is already in local state and localStorage, so we continue
    }
  }

  // Enhanced activity logging methods with team support
  const logCellEdit = (
    rowId: string,
    columnId: string,
    value: any,
    oldValue: any,
    options: { teamVisible?: boolean; entityName?: string } = {},
  ) => {
    logActivity({
      activityType: 'cell_edit',
      entityId: rowId,
      entityType: 'contact',
      entityName: options.entityName,
      fieldName: columnId,
      oldValue,
      newValue: value,
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logContactAdd = (contactId: string, contactName: string, options: { teamVisible?: boolean } = {}) => {
    logActivity({
      activityType: 'contact_add',
      entityId: contactId,
      entityType: 'contact',
      entityName: contactName,
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logColumnAdd = (columnId: string, columnName: string, options: { teamVisible?: boolean } = {}) => {
    logActivity({
      activityType: 'column_add',
      entityId: columnId,
      entityType: 'column',
      entityName: columnName,
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logColumnDelete = (columnId: string, columnName: string, options: { teamVisible?: boolean } = {}) => {
    logActivity({
      activityType: 'column_delete',
      entityId: columnId,
      entityType: 'column',
      entityName: columnName,
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logFilterChange = (filters: any, options: { teamVisible?: boolean } = {}) => {
    logActivity({
      activityType: 'filter_change',
      entityType: 'filter',
      details: filters,
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logNoteAdd = (entityId: string, entityName: string, note: string, options: { teamVisible?: boolean } = {}) => {
    logActivity({
      activityType: 'note_add',
      entityId,
      entityType: 'contact',
      entityName,
      newValue: note,
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logLogin = () => {
    logActivity({
      activityType: 'login',
      activityScope: 'team', // Login is typically team-visible
    })
  }

  // New team-specific activity logging methods
  const logEmailSent = (
    contactId: string,
    contactName: string,
    subject: string,
    options: { teamVisible?: boolean } = {},
  ) => {
    logActivity({
      activityType: 'email',
      entityId: contactId,
      entityType: 'contact',
      entityName: contactName,
      details: { subject },
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logCall = (
    contactId: string,
    contactName: string,
    duration?: number,
    options: { teamVisible?: boolean } = {},
  ) => {
    logActivity({
      activityType: 'call',
      entityId: contactId,
      entityType: 'contact',
      entityName: contactName,
      details: duration ? { duration } : undefined,
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logMeeting = (
    contactId: string,
    contactName: string,
    meetingType?: string,
    options: { teamVisible?: boolean } = {},
  ) => {
    logActivity({
      activityType: 'meeting',
      entityId: contactId,
      entityType: 'contact',
      entityName: contactName,
      details: meetingType ? { type: meetingType } : undefined,
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  const logTaskCreated = (
    taskId: string,
    taskTitle: string,
    contactName?: string,
    options: { teamVisible?: boolean } = {},
  ) => {
    logActivity({
      activityType: 'task',
      entityId: taskId,
      entityType: 'contact',
      entityName: contactName || 'System',
      details: { title: taskTitle, action: 'created' },
      activityScope: options.teamVisible ? 'team' : 'personal',
    })
  }

  return {
    activities,
    isLoading,
    refreshActivities: fetchActivities,
    // Enhanced methods with team support
    logCellEdit,
    logContactAdd,
    logColumnAdd,
    logColumnDelete,
    logFilterChange,
    logNoteAdd,
    logLogin,
    // New team activity methods
    logEmailSent,
    logCall,
    logMeeting,
    logTaskCreated,
    // Generic activity logger
    logActivity,
  }
}
