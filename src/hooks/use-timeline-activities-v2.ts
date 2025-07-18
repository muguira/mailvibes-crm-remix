import { useMemo, useCallback, useEffect, useRef } from 'react'
import { useActivities, Activity } from '@/hooks/supabase/use-activities'
import { useEmails } from '@/hooks/use-emails-store'
import { usePinnedEmails } from '@/hooks/supabase/use-pinned-emails'
import { useStore } from '@/stores'
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

interface UseTimelineActivitiesV2Options {
  contactId?: string
  contactEmail?: string
  includeEmails?: boolean
  autoInitialize?: boolean
}

interface UseTimelineActivitiesV2Return {
  activities: TimelineActivity[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  emailsCount: number
  internalCount: number
  hasMoreEmails: boolean
  syncStatus: 'idle' | 'syncing' | 'completed' | 'failed'
  oldestEmailDate: string | null

  // Actions
  loadMoreEmails: () => Promise<void>
  syncEmailHistory: () => Promise<void>
  refreshEmails: () => Promise<void>
}

// Cache for performance optimization
const TIMESTAMP_CACHE = new Map<string, number>()
const ACTIVITY_TRANSFORM_CACHE = new Map<string, TimelineActivity>()

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

const sortActivitiesByPriorityAndDate = (activities: TimelineActivity[]): TimelineActivity[] => {
  return activities.sort((a, b) => {
    // 1. Pinned activities go first
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1

    // 2. Within each group, sort by date (most recent first)
    const timestampA = getCachedTimestamp(a.timestamp)
    const timestampB = getCachedTimestamp(b.timestamp)
    return timestampB - timestampA
  })
}

/**
 * Timeline activities hook v2 using new Zustand emails store
 *
 * Features:
 * - Infinite scroll from database (20 emails per load)
 * - Background sync without blocking UI
 * - Real-time updates when new emails sync
 * - Performance optimized with caching
 * - Automatic oldest email date calculation
 */
export function useTimelineActivitiesV2(options: UseTimelineActivitiesV2Options = {}): UseTimelineActivitiesV2Return {
  const { contactId, contactEmail, includeEmails = true, autoInitialize = true } = options

  // Performance monitoring
  const { logSummary } = usePerformanceMonitor('useTimelineActivitiesV2')

  // Track initialization to prevent multiple calls
  const initializedContactsRef = useRef<Set<string>>(new Set())

  // Get auth user
  const { authUser } = useStore()

  // Get internal activities (notes, etc.)
  const {
    activities: internalActivities,
    isLoading: internalLoading,
    isError: internalError,
  } = useActivities(contactId)

  // Get emails from new Zustand store
  const emails = useEmails()

  // Extract stable functions to avoid useEffect re-runs
  const { getEmailsForContact, getLoadingState, initializeContactEmails } = emails

  // Initialize emails for this contact if needed - MOVED TO useEffect to prevent render-time setState
  useEffect(() => {
    if (!autoInitialize || !includeEmails || !contactEmail || !authUser?.id) return

    // Check if we already initialized this contact
    const initKey = `${contactEmail}-${authUser.id}`
    if (initializedContactsRef.current.has(initKey)) return

    // Get current state to decide if initialization is needed
    const contactEmails = getEmailsForContact(contactEmail)
    const loading = getLoadingState(contactEmail)

    if (contactEmails.length === 0 && !loading) {
      console.log('🔄 Initializing emails for contact:', contactEmail)
      initializedContactsRef.current.add(initKey)
      initializeContactEmails(contactEmail, authUser.id)
    }
  }, [
    contactEmail,
    authUser?.id,
    autoInitialize,
    includeEmails,
    getEmailsForContact,
    getLoadingState,
    initializeContactEmails,
  ])

  // Extract additional functions from emails store
  const {
    getLoadingMoreState,
    hasMoreEmails: hasMoreEmailsFn,
    getSyncState,
    loadMoreEmails: loadMoreEmailsFn,
    syncContactHistory: syncContactHistoryFn,
    refreshContactEmails: refreshContactEmailsFn,
  } = emails

  // Get email state for this contact
  const contactEmails = contactEmail ? getEmailsForContact(contactEmail) : []
  const emailsLoading = contactEmail ? getLoadingState(contactEmail) : false
  const emailsLoadingMore = contactEmail ? getLoadingMoreState(contactEmail) : false
  const hasMoreEmails = contactEmail ? hasMoreEmailsFn(contactEmail) : false
  const syncStatus = contactEmail ? getSyncState(contactEmail) : 'idle'

  // Get pinned emails
  const { isEmailPinned } = usePinnedEmails(contactEmail)

  // Transform internal activities
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

      if (ACTIVITY_TRANSFORM_CACHE.size > 1000) {
        ACTIVITY_TRANSFORM_CACHE.clear()
      }

      return transformed
    })
  }, [internalActivities])

  // Transform email activities
  const timelineEmailActivities: TimelineActivity[] = useMemo(() => {
    if (!includeEmails || !contactEmails.length) return []

    return contactEmails.map((email: GmailEmail) => {
      const emailTimestamp = email.date
      const cacheKey = `email-${email.id}-${emailTimestamp}-${isEmailPinned(email.id)}`

      if (ACTIVITY_TRANSFORM_CACHE.has(cacheKey)) {
        return ACTIVITY_TRANSFORM_CACHE.get(cacheKey)!
      }

      const activity: TimelineActivity = {
        id: email.id,
        type: 'email' as const,
        timestamp: emailTimestamp,
        source: 'gmail' as const,
        subject: email.subject,
        snippet: email.snippet,
        from: email.from,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        isRead: email.isRead,
        isImportant: email.isImportant,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        labels: email.labels,
        attachments: email.attachments,
        is_pinned: isEmailPinned(email.id),
      }

      ACTIVITY_TRANSFORM_CACHE.set(cacheKey, activity)

      if (ACTIVITY_TRANSFORM_CACHE.size > 1000) {
        ACTIVITY_TRANSFORM_CACHE.clear()
      }

      return activity
    })
  }, [contactEmails, includeEmails, isEmailPinned])

  // Combine and sort all activities
  const allActivities = useMemo(() => {
    const combined = [...timelineInternalActivities, ...timelineEmailActivities]
    return sortActivitiesByPriorityAndDate(combined)
  }, [timelineInternalActivities, timelineEmailActivities])

  // Calculate oldest email date (for relationship date)
  const oldestEmailDate = useMemo(() => {
    if (contactEmails.length === 0) return null

    // Get the oldest email date from currently loaded emails
    const oldestEmail = contactEmails[contactEmails.length - 1]
    return oldestEmail?.date || null
  }, [contactEmails])

  // Actions
  const loadMoreEmails = useCallback(async () => {
    if (contactEmail) {
      await loadMoreEmailsFn(contactEmail)
    }
  }, [contactEmail, loadMoreEmailsFn])

  const syncEmailHistory = useCallback(async () => {
    if (contactEmail && authUser?.id) {
      await syncContactHistoryFn(contactEmail, authUser.id)
    }
  }, [contactEmail, authUser?.id, syncContactHistoryFn])

  const refreshEmails = useCallback(async () => {
    if (contactEmail && authUser?.id) {
      await refreshContactEmailsFn(contactEmail, authUser.id)
    }
  }, [contactEmail, authUser?.id, refreshContactEmailsFn])

  // Calculate loading state
  const loading = internalLoading || emailsLoading
  const error = internalError ? 'Failed to load activities' : null

  // Log performance summary periodically
  if (allActivities.length > 0) {
    logSummary()
  }

  return {
    activities: allActivities,
    loading,
    loadingMore: emailsLoadingMore,
    error,
    emailsCount: contactEmails.length,
    internalCount: timelineInternalActivities.length,
    hasMoreEmails,
    syncStatus,
    oldestEmailDate,
    loadMoreEmails,
    syncEmailHistory,
    refreshEmails,
  }
}
