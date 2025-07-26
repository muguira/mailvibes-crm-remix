import { useAuth } from '@/components/auth'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { useCallback, useEffect, useState } from 'react'

export interface TeamActivityItem {
  id: string
  user_id: string
  user_name: string
  user_email?: string
  timestamp: string
  activity_type: string
  entity_id?: string
  entity_type?: string
  entity_name?: string
  field_name?: string
  old_value?: any
  new_value?: any
  details?: any
  is_pinned: boolean
  organization_id?: string
  activity_scope: 'personal' | 'team' | 'public'
}

export interface ActivityFeedOptions {
  organizationId?: string
  feedType: 'personal' | 'team' | 'combined'
  enableRealtime?: boolean
  pageSize?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useTeamActivityFeed(options: ActivityFeedOptions) {
  const { user } = useAuth()
  const [activities, setActivities] = useState<TeamActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [lastFetched, setLastFetched] = useState<string | null>(null)

  const {
    organizationId,
    feedType,
    enableRealtime = true,
    pageSize = 50,
    autoRefresh = false,
    refreshInterval = 30000,
  } = options

  // Fetch activities based on feed type
  const fetchActivities = useCallback(
    async (offset = 0, reset = false) => {
      if (!user) return

      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('user_activities')
          .select('*')
          .order('timestamp', { ascending: false })
          .range(offset, offset + pageSize - 1)

        // Apply filters based on feed type
        switch (feedType) {
          case 'personal':
            query = query.eq('user_id', user.id)
            break
          case 'team':
            if (organizationId) {
              query = query
                .eq('organization_id', organizationId)
                .in('activity_scope', ['team', 'public'])
                .neq('user_id', user.id) // Exclude current user from team feed
            } else {
              // No organization - return empty for team feed
              setActivities([])
              setHasMore(false)
              setLoading(false)
              return
            }
            break
          case 'combined':
            if (organizationId) {
              query = query.or(
                `user_id.eq.${user.id},and(organization_id.eq.${organizationId},activity_scope.in.(team,public))`,
              )
            } else {
              query = query.eq('user_id', user.id)
            }
            break
        }

        const { data, error } = await query

        if (error) throw error

        // Map and process activities
        const mappedActivities = (data || []).map(
          (item: any): TeamActivityItem => ({
            id: item.id,
            user_id: item.user_id,
            user_name: item.user_name,
            user_email: item.user_email,
            timestamp: item.timestamp,
            activity_type: item.activity_type,
            entity_id: item.entity_id,
            entity_type: item.entity_type,
            entity_name: item.entity_name,
            field_name: item.field_name,
            old_value: item.old_value,
            new_value: item.new_value,
            details: item.details,
            is_pinned: item.is_pinned || false,
            organization_id: item.organization_id,
            activity_scope: item.activity_scope || 'personal',
          }),
        )

        if (reset) {
          setActivities(mappedActivities)
        } else {
          setActivities(prev => [...prev, ...mappedActivities])
        }

        setHasMore(mappedActivities.length === pageSize)
        setLastFetched(new Date().toISOString())

        logger.log(`Fetched ${mappedActivities.length} ${feedType} activities`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities'
        logger.error('Error fetching activities:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [user, feedType, organizationId, pageSize],
  )

  // Load more activities (pagination)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    await fetchActivities(activities.length, false)
  }, [loading, hasMore, activities.length, fetchActivities])

  // Refresh activities (reset and fetch)
  const refresh = useCallback(async () => {
    await fetchActivities(0, true)
  }, [fetchActivities])

  // Add new activity (for real-time updates)
  const addActivity = useCallback((activity: TeamActivityItem) => {
    setActivities(prev => {
      // Check if activity already exists
      if (prev.some(a => a.id === activity.id)) {
        return prev
      }

      // Add to beginning and maintain sort order
      return [activity, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    })
  }, [])

  // Update existing activity
  const updateActivity = useCallback((id: string, updates: Partial<TeamActivityItem>) => {
    setActivities(prev => prev.map(activity => (activity.id === id ? { ...activity, ...updates } : activity)))
  }, [])

  // Remove activity
  const removeActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(activity => activity.id !== id))
  }, [])

  // Toggle pin status
  const togglePin = useCallback(
    async (id: string) => {
      try {
        const activity = activities.find(a => a.id === id)
        if (!activity) return

        const newPinnedState = !activity.is_pinned

        const { error } = await supabase.from('user_activities').update({ is_pinned: newPinnedState }).eq('id', id)

        if (error) throw error

        updateActivity(id, { is_pinned: newPinnedState })
        logger.log(`Activity ${id} ${newPinnedState ? 'pinned' : 'unpinned'}`)
      } catch (err) {
        logger.error('Error toggling pin:', err)
        setError(err instanceof Error ? err.message : 'Failed to toggle pin')
      }
    },
    [activities, updateActivity],
  )

  // Real-time subscription setup
  useEffect(() => {
    if (!enableRealtime || !user) return

    const channel = supabase.channel('activity_feed_updates')

    // Subscribe to personal activities
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_activities',
        filter: `user_id=eq.${user.id}`,
      },
      payload => {
        logger.log('Real-time personal activity update:', payload)

        const { eventType, new: newRecord, old: oldRecord } = payload

        if (eventType === 'INSERT' && newRecord && (feedType === 'personal' || feedType === 'combined')) {
          addActivity({
            id: newRecord.id,
            user_id: newRecord.user_id,
            user_name: newRecord.user_name,
            user_email: newRecord.user_email,
            timestamp: newRecord.timestamp,
            activity_type: newRecord.activity_type,
            entity_id: newRecord.entity_id,
            entity_type: newRecord.entity_type,
            entity_name: newRecord.entity_name,
            field_name: newRecord.field_name,
            old_value: newRecord.old_value,
            new_value: newRecord.new_value,
            details: newRecord.details,
            is_pinned: newRecord.is_pinned || false,
            organization_id: newRecord.organization_id,
            activity_scope: newRecord.activity_scope || 'personal',
          })
        } else if (eventType === 'UPDATE' && newRecord) {
          updateActivity(newRecord.id, newRecord)
        } else if (eventType === 'DELETE' && oldRecord) {
          removeActivity(oldRecord.id)
        }
      },
    )

    // Subscribe to team activities if organization exists
    if (organizationId && (feedType === 'team' || feedType === 'combined')) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_activities',
          filter: `organization_id=eq.${organizationId}`,
        },
        payload => {
          logger.log('Real-time team activity update:', payload)

          const { eventType, new: newRecord, old: oldRecord } = payload

          if (
            eventType === 'INSERT' &&
            newRecord &&
            (newRecord.activity_scope === 'team' || newRecord.activity_scope === 'public') &&
            newRecord.user_id !== user.id
          ) {
            addActivity({
              id: newRecord.id,
              user_id: newRecord.user_id,
              user_name: newRecord.user_name,
              user_email: newRecord.user_email,
              timestamp: newRecord.timestamp,
              activity_type: newRecord.activity_type,
              entity_id: newRecord.entity_id,
              entity_type: newRecord.entity_type,
              entity_name: newRecord.entity_name,
              field_name: newRecord.field_name,
              old_value: newRecord.old_value,
              new_value: newRecord.new_value,
              details: newRecord.details,
              is_pinned: newRecord.is_pinned || false,
              organization_id: newRecord.organization_id,
              activity_scope: newRecord.activity_scope,
            })
          } else if (eventType === 'UPDATE' && newRecord) {
            updateActivity(newRecord.id, newRecord)
          } else if (eventType === 'DELETE' && oldRecord) {
            removeActivity(oldRecord.id)
          }
        },
      )
    }

    channel.subscribe(status => {
      setIsConnected(status === 'SUBSCRIBED')
      logger.log(`Activity feed real-time status: ${status}`)
    })

    return () => {
      supabase.removeChannel(channel)
      setIsConnected(false)
    }
  }, [enableRealtime, user, organizationId, feedType, addActivity, updateActivity, removeActivity])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const interval = setInterval(() => {
      if (!loading) {
        refresh()
      }
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loading, refresh])

  // Initial fetch
  useEffect(() => {
    fetchActivities(0, true)
  }, [fetchActivities])

  // Clear activities when feed type or organization changes
  useEffect(() => {
    setActivities([])
    setHasMore(true)
    setError(null)
  }, [feedType, organizationId])

  return {
    // Data
    activities,
    loading,
    error,
    hasMore,
    isConnected,
    lastFetched,

    // Actions
    refresh,
    loadMore,
    togglePin,
    addActivity,
    updateActivity,
    removeActivity,

    // Utilities
    clearError: () => setError(null),
    isEmpty: activities.length === 0 && !loading,

    // Statistics (computed)
    stats: {
      totalActivities: activities.length,
      pinnedActivities: activities.filter(a => a.is_pinned).length,
      uniqueUsers: new Set(activities.map(a => a.user_id)).size,
      activityTypes: activities.reduce(
        (acc, activity) => {
          acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    },
  }
}

// Hook for personal activities only
export function usePersonalActivityFeed(options?: Omit<ActivityFeedOptions, 'feedType'>) {
  return useTeamActivityFeed({
    ...options,
    feedType: 'personal',
  })
}

// Hook for team activities only
export function useTeamOnlyActivityFeed(
  organizationId: string,
  options?: Omit<ActivityFeedOptions, 'feedType' | 'organizationId'>,
) {
  return useTeamActivityFeed({
    ...options,
    feedType: 'team',
    organizationId,
  })
}

// Hook for combined personal + team activities
export function useCombinedActivityFeed(organizationId?: string, options?: Omit<ActivityFeedOptions, 'feedType'>) {
  return useTeamActivityFeed({
    ...options,
    feedType: 'combined',
    organizationId,
  })
}
