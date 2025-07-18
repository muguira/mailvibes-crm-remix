/**
 * @deprecated Use useTimelineActivitiesV2 from use-timeline-activities-v2.ts instead
 *
 * This hook has been replaced with a Zustand-based implementation that provides:
 * - True infinite scroll from database
 * - Background sync without blocking UI
 * - Better performance and centralized state management
 * - Dynamic relationship date calculation
 *
 * Migration guide:
 * - Replace: useTimelineActivities({ contactId, contactEmail, maxEmails: 20 })
 * - With: useTimelineActivitiesV2({ contactId, contactEmail, autoInitialize: true })
 */

import { useMemo, useCallback } from 'react'
import { useActivities, Activity } from '@/hooks/supabase/use-activities'
import { useHybridContactEmails } from '@/hooks/use-hybrid-contact-emails'
import { usePinnedEmails } from '@/hooks/supabase/use-pinned-emails'
import { useGmailAccounts, useGmailMainLoading, useGmailError } from '@/stores/gmail'
import { GmailEmail } from '@/services/google/gmailApi'
import { logger } from '@/utils/logger'
import { usePerformanceMonitor } from './use-performance-monitor'

export interface TimelineActivity {
  id: string
  type: 'note' | 'email' | 'call' | 'meeting' | 'task' | 'system'
  content?: string | null
  timestamp: string
  source: 'internal' | 'gmail'
  is_pinned?: boolean

  // Email-specific fields
  subject?: string
  from?: {
    name?: string
    email: string
  }
  to?: Array<{
    name?: string
    email: string
  }>
  cc?: Array<{
    name?: string
    email: string
  }>
  bcc?: Array<{
    name?: string
    email: string
  }>
  snippet?: string
  isRead?: boolean
  isImportant?: boolean
  bodyText?: string
  bodyHtml?: string
  labels?: string[]
  attachments?: any[]
}

interface UseTimelineActivitiesOptions {
  contactId?: string
  contactEmail?: string
  includeEmails?: boolean
  maxEmails?: number
}

interface UseTimelineActivitiesReturn {
  activities: TimelineActivity[]
  loading: boolean
  error: string | null
  emailsCount: number
  internalCount: number
  hasGmailAccounts: boolean
  emailSource: 'database' | 'api' | 'hybrid'
  lastSyncAt?: Date
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed'
  refreshEmails: () => Promise<void>
  triggerSync: () => Promise<void>
}

// OPTIMIZED: Cache for parsed timestamps to avoid repeated Date parsing
const TIMESTAMP_CACHE = new Map<string, number>()
const ACTIVITY_TRANSFORM_CACHE = new Map<string, TimelineActivity>()

// OPTIMIZED: Cached timestamp parsing function
const getCachedTimestamp = (timestamp: string): number => {
  if (TIMESTAMP_CACHE.has(timestamp)) {
    return TIMESTAMP_CACHE.get(timestamp)!
  }

  const parsed = new Date(timestamp).getTime()
  TIMESTAMP_CACHE.set(timestamp, parsed)

  // Clear cache if it gets too large
  if (TIMESTAMP_CACHE.size > 500) {
    TIMESTAMP_CACHE.clear()
  }

  return parsed
}

// OPTIMIZED: Memoized sorting function for activities
const sortActivitiesByPriorityAndDate = (activities: TimelineActivity[]): TimelineActivity[] => {
  return activities.sort((a, b) => {
    // 1. Pinned activities go first
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1

    // 2. Within each group, sort by date (most recent first) using cached timestamps
    const timestampA = getCachedTimestamp(a.timestamp)
    const timestampB = getCachedTimestamp(b.timestamp)
    return timestampB - timestampA
  })
}

export function useTimelineActivities(options: UseTimelineActivitiesOptions = {}): UseTimelineActivitiesReturn {
  const { contactId, contactEmail, includeEmails = true, maxEmails = 20 } = options

  // Performance monitoring for optimization tracking
  const { logSummary, renderCount } = usePerformanceMonitor('useTimelineActivities')

  // Use new Gmail store selectors
  const connectedAccounts = useGmailAccounts()
  const gmailLoading = useGmailMainLoading()
  const hasGmailAccounts = connectedAccounts.length > 0

  // Get internal activities
  const {
    activities: internalActivities,
    isLoading: internalLoading,
    isError: internalError,
  } = useActivities(contactId)

  // Get emails using hybrid approach
  const {
    emails,
    loading: emailsLoading,
    error: emailsError,
    source: emailSource,
    lastSyncAt,
    syncStatus,
    refresh: refreshEmails,
    triggerSync,
  } = useHybridContactEmails({
    contactEmail,
    maxResults: maxEmails,
    autoFetch: includeEmails && hasGmailAccounts,
  })

  // Get pinned emails - memoize the function to prevent recreation
  const { isEmailPinned } = usePinnedEmails(contactEmail)

  // OPTIMIZED: Memoize internal activity transformation with caching
  const timelineInternalActivities: TimelineActivity[] = useMemo(() => {
    if (!internalActivities) return []

    return internalActivities.map((activity: Activity) => {
      const cacheKey = `internal-${activity.id}-${activity.timestamp}-${activity.is_pinned}`

      if (ACTIVITY_TRANSFORM_CACHE.has(cacheKey)) {
        return ACTIVITY_TRANSFORM_CACHE.get(cacheKey)!
      }

      const transformed: TimelineActivity = {
        id: activity.id,
        type: activity.type as TimelineActivity['type'],
        content: activity.content,
        timestamp: activity.timestamp,
        source: 'internal' as const,
        is_pinned: activity.is_pinned || false,
      }

      ACTIVITY_TRANSFORM_CACHE.set(cacheKey, transformed)

      // Clear cache if it gets too large
      if (ACTIVITY_TRANSFORM_CACHE.size > 1000) {
        ACTIVITY_TRANSFORM_CACHE.clear()
      }

      return transformed
    })
  }, [internalActivities])

  // OPTIMIZED: Memoize email activity transformation with efficient pinned checks
  const timelineEmailActivities: TimelineActivity[] = useMemo(() => {
    if (!includeEmails || !hasGmailAccounts || !emails.length) {
      return []
    }

    // Batch check for pinned emails to reduce function calls
    const emailIds = emails.map(email => email.id)
    const pinnedStatusMap = new Map<string, boolean>()

    emailIds.forEach(id => {
      pinnedStatusMap.set(id, isEmailPinned(id))
    })

    return emails.map((email: GmailEmail) => {
      const cacheKey = `email-${email.id}-${email.date}-${pinnedStatusMap.get(email.id)}`

      if (ACTIVITY_TRANSFORM_CACHE.has(cacheKey)) {
        return ACTIVITY_TRANSFORM_CACHE.get(cacheKey)!
      }

      const transformed: TimelineActivity = {
        id: `email-${email.id}`,
        type: 'email' as const,
        content: email.snippet,
        timestamp: email.date,
        source: 'gmail' as const,
        is_pinned: pinnedStatusMap.get(email.id) || false,
        subject: email.subject,
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        snippet: email.snippet,
        isRead: email.isRead,
        isImportant: email.isImportant,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        labels: email.labels,
        attachments: email.attachments,
      }

      ACTIVITY_TRANSFORM_CACHE.set(cacheKey, transformed)
      return transformed
    })
  }, [emails, includeEmails, hasGmailAccounts, isEmailPinned])

  // OPTIMIZED: Highly efficient activity combination and sorting
  const allActivities: TimelineActivity[] = useMemo(() => {
    // Early return for empty arrays
    if (timelineInternalActivities.length === 0 && timelineEmailActivities.length === 0) {
      return []
    }

    // Use more efficient array concatenation
    const combined =
      timelineInternalActivities.length === 0
        ? timelineEmailActivities
        : timelineEmailActivities.length === 0
          ? timelineInternalActivities
          : [...timelineInternalActivities, ...timelineEmailActivities]

    // Use optimized sorting function
    const sorted = sortActivitiesByPriorityAndDate(combined)

    // Only log in development and when there are pinned items
    if (process.env.NODE_ENV === 'development') {
      const pinnedCount = sorted.filter(a => a.is_pinned).length
      if (pinnedCount > 0) {
        logger.debug('Timeline sorting completed:', {
          totalActivities: sorted.length,
          pinnedCount,
          unpinnedCount: sorted.length - pinnedCount,
        })
      }
    }

    return sorted
  }, [timelineInternalActivities, timelineEmailActivities])

  // OPTIMIZED: Memoize loading and error states
  const loadingState = useMemo(() => {
    return internalLoading || (includeEmails && hasGmailAccounts && emailsLoading)
  }, [internalLoading, includeEmails, hasGmailAccounts, emailsLoading])

  const errorState = useMemo(() => {
    return (
      (internalError ? 'Failed to load activities' : null) || (includeEmails && hasGmailAccounts ? emailsError : null)
    )
  }, [internalError, includeEmails, hasGmailAccounts, emailsError])

  // OPTIMIZED: Memoize counts to prevent recalculation
  const activityCounts = useMemo(
    () => ({
      emailsCount: timelineEmailActivities.length,
      internalCount: timelineInternalActivities.length,
    }),
    [timelineEmailActivities.length, timelineInternalActivities.length],
  )

  // Log performance summary periodically for monitoring
  useMemo(() => {
    if (renderCount > 0 && renderCount % 15 === 0) {
      logSummary()
    }
  }, [renderCount, logSummary])

  return {
    activities: allActivities,
    loading: loadingState,
    error: errorState,
    emailsCount: activityCounts.emailsCount,
    internalCount: activityCounts.internalCount,
    hasGmailAccounts,
    emailSource,
    lastSyncAt,
    syncStatus,
    refreshEmails,
    triggerSync,
  }
}

// OPTIMIZED: Memoized helper functions for UI components with caching
const ACTIVITY_ICON_CACHE = new Map<string, string>()
const ACTIVITY_COLOR_CACHE = new Map<string, string>()

export const getActivityIcon = (activity: TimelineActivity): string => {
  const cacheKey = `${activity.type}-${activity.isImportant}`

  if (ACTIVITY_ICON_CACHE.has(cacheKey)) {
    return ACTIVITY_ICON_CACHE.get(cacheKey)!
  }

  let icon: string
  switch (activity.type) {
    case 'email':
      icon = activity.isImportant ? 'mail-priority' : 'mail'
      break
    case 'call':
      icon = 'phone'
      break
    case 'meeting':
      icon = 'calendar'
      break
    case 'task':
      icon = 'check-square'
      break
    case 'note':
      icon = 'file-text'
      break
    case 'system':
      icon = 'settings'
      break
    default:
      icon = 'circle'
  }

  ACTIVITY_ICON_CACHE.set(cacheKey, icon)

  // Clear cache if it gets too large
  if (ACTIVITY_ICON_CACHE.size > 50) {
    ACTIVITY_ICON_CACHE.clear()
  }

  return icon
}

export const getActivityColor = (activity: TimelineActivity): string => {
  const cacheKey = `${activity.source}-${activity.type}-${activity.isImportant}`

  if (ACTIVITY_COLOR_CACHE.has(cacheKey)) {
    return ACTIVITY_COLOR_CACHE.get(cacheKey)!
  }

  let color: string
  if (activity.source === 'gmail') {
    color = activity.isImportant ? 'text-red-600' : 'text-blue-600'
  } else {
    switch (activity.type) {
      case 'call':
        color = 'text-green-600'
        break
      case 'meeting':
        color = 'text-purple-600'
        break
      case 'task':
        color = 'text-orange-600'
        break
      case 'note':
        color = 'text-gray-600'
        break
      case 'system':
        color = 'text-gray-500'
        break
      default:
        color = 'text-gray-600'
    }
  }

  ACTIVITY_COLOR_CACHE.set(cacheKey, color)

  // Clear cache if it gets too large
  if (ACTIVITY_COLOR_CACHE.size > 50) {
    ACTIVITY_COLOR_CACHE.clear()
  }

  return color
}

// OPTIMIZED: Cached timestamp formatting with Map-based cache
const TIMESTAMP_FORMAT_CACHE = new Map<string, string>()

export const formatActivityTimestamp = (timestamp: string): string => {
  if (TIMESTAMP_FORMAT_CACHE.has(timestamp)) {
    return TIMESTAMP_FORMAT_CACHE.get(timestamp)!
  }

  const date = new Date(timestamp)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  let formatted: string
  if (diffInMinutes < 1) {
    formatted = 'Just now'
  } else if (diffInMinutes < 60) {
    formatted = `${diffInMinutes}m ago`
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60)
    formatted = `${hours}h ago`
  } else {
    const days = Math.floor(diffInMinutes / 1440)
    if (days === 1) {
      formatted = 'Yesterday'
    } else if (days < 7) {
      formatted = `${days}d ago`
    } else {
      formatted = date.toLocaleDateString()
    }
  }

  TIMESTAMP_FORMAT_CACHE.set(timestamp, formatted)

  // Clear cache if it gets too large
  if (TIMESTAMP_FORMAT_CACHE.size > 200) {
    TIMESTAMP_FORMAT_CACHE.clear()
  }

  return formatted
}
