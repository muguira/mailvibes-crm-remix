import { useAuth } from '@/components/auth'
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'

export interface OptimizedActivityItem {
  id: string
  user_id: string
  user_name: string
  timestamp: string
  activity_type: string
  entity_id?: string
  entity_type?: string
  entity_name?: string
  field_name?: string
  new_value?: any
  is_pinned: boolean
  activity_scope: 'personal' | 'team' | 'public'
}

export interface ActivityFeedConfig {
  feedType: 'personal' | 'team' | 'combined'
  organizationId?: string
  pageSize?: number
  enableRealtime?: boolean
}

// Query keys for React Query cache management
export const activityQueryKeys = {
  all: ['activities'] as const,
  feed: (type: string, orgId?: string) => [...activityQueryKeys.all, 'feed', type, orgId] as const,
  personal: (userId: string) => [...activityQueryKeys.all, 'personal', userId] as const,
  team: (orgId: string) => [...activityQueryKeys.all, 'team', orgId] as const,
  combined: (userId: string, orgId?: string) => [...activityQueryKeys.all, 'combined', userId, orgId] as const,
}

// Optimized query function with minimal data fetching
async function fetchActivities(
  feedType: string,
  userId: string,
  organizationId?: string,
  pageParam = 0,
  pageSize = 50,
) {
  // Only select necessary fields to reduce payload
  const selectFields = `
    id,
    user_id,
    user_name,
    timestamp,
    activity_type,
    entity_id,
    entity_type,
    entity_name,
    field_name,
    new_value,
    is_pinned,
    activity_scope
  `

  let query = supabase
    .from('user_activities')
    .select(selectFields)
    .order('timestamp', { ascending: false })
    .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1)

  // Optimized filters based on feed type
  switch (feedType) {
    case 'personal':
      query = query.eq('user_id', userId)
      break
    case 'team':
      if (!organizationId) {
        return { data: [], hasMore: false }
      }
      query = query
        .eq('organization_id', organizationId)
        .in('activity_scope', ['team', 'public'])
        .neq('user_id', userId)
      break
    case 'combined':
      if (organizationId) {
        query = query.or(
          `user_id.eq.${userId},and(organization_id.eq.${organizationId},activity_scope.in.(team,public))`,
        )
      } else {
        query = query.eq('user_id', userId)
      }
      break
  }

  const { data, error } = await query

  if (error) {
    logger.error(`Error fetching ${feedType} activities:`, error)
    throw error
  }

  const activities: OptimizedActivityItem[] = (data || []).map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    user_name: item.user_name,
    timestamp: item.timestamp,
    activity_type: item.activity_type,
    entity_id: item.entity_id,
    entity_type: item.entity_type,
    entity_name: item.entity_name,
    field_name: item.field_name,
    new_value: item.new_value,
    is_pinned: item.is_pinned || false,
    activity_scope: item.activity_scope || 'personal',
  }))

  return {
    data: activities,
    hasMore: activities.length === pageSize,
    nextPage: activities.length === pageSize ? pageParam + 1 : undefined,
  }
}

export function useOptimizedActivityFeed(config: ActivityFeedConfig) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)

  const { feedType, organizationId, pageSize = 50, enableRealtime = true } = config

  // Memoized query key to prevent unnecessary re-renders
  const queryKey = useMemo(() => {
    switch (feedType) {
      case 'personal':
        return activityQueryKeys.personal(user?.id || '')
      case 'team':
        return activityQueryKeys.team(organizationId || '')
      case 'combined':
        return activityQueryKeys.combined(user?.id || '', organizationId)
      default:
        return activityQueryKeys.personal(user?.id || '')
    }
  }, [feedType, user?.id, organizationId])

  // Infinite query for pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, refetch } = useInfiniteQuery(
    {
      queryKey,
      queryFn: ({ pageParam = 0 }) => fetchActivities(feedType, user?.id || '', organizationId, pageParam, pageSize),
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextPage,
      enabled: !!user,
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  )

  // Flatten all pages into a single array
  const activities = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || []
  }, [data])

  // Pin/unpin mutation
  const pinMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase.from('user_activities').update({ is_pinned: isPinned }).eq('id', id)

      if (error) throw error
      return { id, isPinned }
    },
    onMutate: async ({ id, isPinned }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey })
      const previousData = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((activity: OptimizedActivityItem) =>
              activity.id === id ? { ...activity, is_pinned: isPinned } : activity,
            ),
          })),
        }
      })

      return { previousData }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData)
      }
      logger.error('Error toggling pin:', err)
    },
    onSuccess: ({ id, isPinned }) => {
      logger.log(`Activity ${id} ${isPinned ? 'pinned' : 'unpinned'}`)
    },
  })

  // Toggle pin function
  const togglePin = useCallback(
    (id: string) => {
      const activity = activities.find(a => a.id === id)
      if (activity) {
        pinMutation.mutate({ id, isPinned: !activity.is_pinned })
      }
    },
    [activities, pinMutation],
  )

  // Real-time subscription with optimizations
  useEffect(() => {
    if (!enableRealtime || !user) return

    const channel = supabase.channel(`activity_feed_${feedType}_${user.id}`)

    // Personal activities subscription
    if (feedType === 'personal' || feedType === 'combined') {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activities',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          const newActivity = payload.new as any
          if (newActivity) {
            queryClient.setQueryData(queryKey, (old: any) => {
              if (!old) return old

              const optimizedActivity: OptimizedActivityItem = {
                id: newActivity.id,
                user_id: newActivity.user_id,
                user_name: newActivity.user_name,
                timestamp: newActivity.timestamp,
                activity_type: newActivity.activity_type,
                entity_id: newActivity.entity_id,
                entity_type: newActivity.entity_type,
                entity_name: newActivity.entity_name,
                field_name: newActivity.field_name,
                new_value: newActivity.new_value,
                is_pinned: newActivity.is_pinned || false,
                activity_scope: newActivity.activity_scope || 'personal',
              }

              return {
                ...old,
                pages: [{ ...old.pages[0], data: [optimizedActivity, ...old.pages[0].data] }, ...old.pages.slice(1)],
              }
            })
          }
        },
      )
    }

    // Team activities subscription
    if ((feedType === 'team' || feedType === 'combined') && organizationId) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_activities',
          filter: `organization_id=eq.${organizationId}`,
        },
        payload => {
          const newActivity = payload.new as any
          if (
            newActivity &&
            (newActivity.activity_scope === 'team' || newActivity.activity_scope === 'public') &&
            newActivity.user_id !== user.id
          ) {
            queryClient.setQueryData(queryKey, (old: any) => {
              if (!old) return old

              const optimizedActivity: OptimizedActivityItem = {
                id: newActivity.id,
                user_id: newActivity.user_id,
                user_name: newActivity.user_name,
                timestamp: newActivity.timestamp,
                activity_type: newActivity.activity_type,
                entity_id: newActivity.entity_id,
                entity_type: newActivity.entity_type,
                entity_name: newActivity.entity_name,
                field_name: newActivity.field_name,
                new_value: newActivity.new_value,
                is_pinned: newActivity.is_pinned || false,
                activity_scope: newActivity.activity_scope,
              }

              return {
                ...old,
                pages: [{ ...old.pages[0], data: [optimizedActivity, ...old.pages[0].data] }, ...old.pages.slice(1)],
              }
            })
          }
        },
      )
    }

    channel.subscribe(status => {
      setIsConnected(status === 'SUBSCRIBED')
    })

    return () => {
      supabase.removeChannel(channel)
      setIsConnected(false)
    }
  }, [enableRealtime, user, organizationId, feedType, queryClient, queryKey])

  // Computed statistics
  const stats = useMemo(() => {
    const pinnedCount = activities.filter(a => a.is_pinned).length
    const userIds = new Set(activities.map(a => a.user_id))
    const activityTypes = activities.reduce(
      (acc, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalActivities: activities.length,
      pinnedActivities: pinnedCount,
      uniqueUsers: userIds.size,
      activityTypes,
    }
  }, [activities])

  return {
    // Data
    activities,
    loading: isLoading,
    error: isError ? error : null,
    hasMore: hasNextPage,
    isConnected,

    // Actions
    refresh: refetch,
    loadMore: fetchNextPage,
    togglePin,
    isLoadingMore: isFetchingNextPage,

    // Utilities
    isEmpty: activities.length === 0 && !isLoading,
    stats,

    // Clear cache
    clearCache: () => queryClient.removeQueries({ queryKey }),
  }
}

// Specialized hooks for different feed types
export function usePersonalActivityFeed(options?: Omit<ActivityFeedConfig, 'feedType'>) {
  return useOptimizedActivityFeed({
    ...options,
    feedType: 'personal',
  })
}

export function useTeamActivityFeed(
  organizationId: string,
  options?: Omit<ActivityFeedConfig, 'feedType' | 'organizationId'>,
) {
  return useOptimizedActivityFeed({
    ...options,
    feedType: 'team',
    organizationId,
  })
}

export function useCombinedActivityFeed(organizationId?: string, options?: Omit<ActivityFeedConfig, 'feedType'>) {
  return useOptimizedActivityFeed({
    ...options,
    feedType: 'combined',
    organizationId,
  })
}
