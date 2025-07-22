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
  type: 'note' | 'email' | 'call' | 'meeting' | 'task' | 'system' | 'email_sent' | 'email_thread'
  content?: string | null
  timestamp: string
  source: 'internal' | 'gmail'
  is_pinned?: boolean

  // Email-specific fields
  subject?: string
  threadId?: string
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

  // Activity details (for emails sent from CRM)
  details?: any

  // ✅ NEW: Email threading fields
  emailsInThread?: TimelineActivity[] // For email_thread type, contains all emails in chronological order
  threadEmailCount?: number // Total emails in this thread
  latestEmail?: TimelineActivity // Most recent email in thread (for display)
  isThreadExpanded?: boolean // UI state for thread expansion
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

// ✅ PERFORMANCE: Global cache to prevent re-processing same emails
const emailGroupingCache = new Map<
  string,
  {
    result: TimelineActivity[]
    timestamp: number
    emailIds: Set<string>
  }
>()

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 50

// ✅ PERFORMANCE: Cleanup old cache entries
const cleanupEmailGroupingCache = () => {
  const now = Date.now()
  let removedCount = 0

  for (const [key, cached] of emailGroupingCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      emailGroupingCache.delete(key)
      removedCount++
    }
  }

  // If cache is too large, remove oldest entries
  if (emailGroupingCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(emailGroupingCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2))

    toRemove.forEach(([key]) => {
      emailGroupingCache.delete(key)
      removedCount++
    })
  }

  if (process.env.NODE_ENV === 'development' && removedCount > 0) {
    console.log(`🧹 [Timeline] Cleaned up ${removedCount} email grouping cache entries`)
  }
}

// ✅ PERFORMANCE: Create cache key from email list
const createEmailsCacheKey = (emails: TimelineActivity[]): string => {
  if (emails.length === 0) return 'empty'

  // Create a stable key based on email IDs and count
  const emailIds = emails
    .map(e => e.id)
    .sort()
    .join(',')
  return `${emails.length}-${emailIds.slice(0, 100)}` // Limit key length
}

// ✅ PERFORMANCE: Check if emails have changed for cache validation
const emailsHaveChanged = (emails: TimelineActivity[], cachedEmailIds: Set<string>): boolean => {
  if (emails.length !== cachedEmailIds.size) return true

  for (const email of emails) {
    if (!cachedEmailIds.has(email.id)) return true
  }

  return false
}

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

// ✅ PERFORMANCE: Optimized email grouping algorithm - O(n log n) instead of O(n²)
const groupEmailsByThread = (emailActivities: TimelineActivity[]): TimelineActivity[] => {
  if (emailActivities.length === 0) return []

  // ✅ PERFORMANCE: Check cache first
  const cacheKey = createEmailsCacheKey(emailActivities)
  const cached = emailGroupingCache.get(cacheKey)

  if (cached && !emailsHaveChanged(emailActivities, cached.emailIds)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [Timeline] Using cached email grouping result:', {
        cacheKey: cacheKey.slice(0, 50) + '...',
        originalEmails: emailActivities.length,
        cachedResult: cached.result.length,
        cacheAge: `${Math.round((Date.now() - cached.timestamp) / 1000)}s`,
      })
    }
    return cached.result
  }

  // ✅ PERFORMANCE: Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 [Timeline] Starting optimized email grouping process:', {
      totalEmails: emailActivities.length,
      cacheKey: cacheKey.slice(0, 50) + '...',
      cacheHit: false,
    })
  }

  // ✅ PERFORMANCE: Pre-allocated Maps with estimated size for better performance
  const threadGroups = new Map<string, TimelineActivity[]>()
  const standaloneEmails: TimelineActivity[] = []
  const subjectToThreadMap = new Map<string, Set<string>>() // Track subjects per thread

  // ✅ PERFORMANCE: Single pass O(n) to group by threadId and validate
  emailActivities.forEach(email => {
    const threadId = email.threadId

    // Check if this is a real Gmail threadId (not artificial)
    const isRealThreadId =
      threadId &&
      !threadId.includes('optimistic-') &&
      !threadId.includes('subject-') &&
      !threadId.includes('new-conversation-') &&
      threadId !== 'reply-thread'

    if (isRealThreadId) {
      // Add to thread group
      if (!threadGroups.has(threadId)) {
        threadGroups.set(threadId, [])
        subjectToThreadMap.set(threadId, new Set())
      }
      threadGroups.get(threadId)!.push(email)

      // Track subject for this thread
      if (email.subject) {
        const baseSubject = email.subject.replace(/^(Re:|RE:|Fwd:|FWD:)\s*/g, '').trim()
        if (baseSubject) {
          subjectToThreadMap.get(threadId)!.add(baseSubject)
        }
      }
    } else {
      // No valid threadId - keep as standalone
      standaloneEmails.push(email)
    }
  })

  const result: TimelineActivity[] = []

  // ✅ PERFORMANCE: Process thread groups efficiently - O(m log k) where m is number of threads, k is max emails per thread
  threadGroups.forEach((emailsInThread, threadId) => {
    if (emailsInThread.length === 1) {
      // Single email in thread - keep as individual email
      result.push(emailsInThread[0])
    } else {
      // ✅ PERFORMANCE: Multiple emails in thread - validate they belong together by subject consistency
      const subjects = subjectToThreadMap.get(threadId) || new Set()

      // If emails in thread have very different subjects, they might be incorrectly grouped
      // For now, trust Gmail's threadId but this could be enhanced in the future

      // Sort emails in thread chronologically (oldest first for thread display)
      // ✅ PERFORMANCE: Use cached timestamps for faster sorting
      const sortedEmails = emailsInThread.sort(
        (a, b) => getCachedTimestamp(a.timestamp) - getCachedTimestamp(b.timestamp),
      )

      // Find the latest email for the thread summary
      const latestEmail = sortedEmails[sortedEmails.length - 1]

      // ✅ PERFORMANCE: Check if any email in thread is pinned using some() for early exit
      const isThreadPinned = emailsInThread.some(email => email.is_pinned)

      // Create thread activity
      const threadActivity: TimelineActivity = {
        id: `thread-${threadId}`, // Unique ID for the thread
        type: 'email_thread',
        timestamp: latestEmail.timestamp, // Use latest email timestamp for sorting
        source: 'gmail',
        is_pinned: isThreadPinned,

        // Use latest email data for thread header display
        subject: latestEmail.subject,
        threadId: threadId,
        from: latestEmail.from,
        to: latestEmail.to,
        cc: latestEmail.cc,
        bcc: latestEmail.bcc,
        snippet: latestEmail.snippet,
        isRead: latestEmail.isRead,
        isImportant: latestEmail.isImportant,
        labels: latestEmail.labels,

        // Thread-specific data
        emailsInThread: sortedEmails,
        threadEmailCount: emailsInThread.length,
        latestEmail: latestEmail,
        isThreadExpanded: false, // Default to collapsed
      }

      result.push(threadActivity)
    }
  })

  // Add standalone emails to result
  result.push(...standaloneEmails)

  // ✅ PERFORMANCE: Cache the result
  const emailIds = new Set(emailActivities.map(e => e.id))
  emailGroupingCache.set(cacheKey, {
    result: result,
    timestamp: Date.now(),
    emailIds: emailIds,
  })

  // ✅ PERFORMANCE: Cleanup old cache entries periodically
  if (Math.random() < 0.1) {
    // 10% chance to cleanup
    cleanupEmailGroupingCache()
  }

  // ✅ PERFORMANCE: Only log detailed results in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 [Timeline] Optimized email grouping completed:', {
      originalEmails: emailActivities.length,
      resultingActivities: result.length,
      threads: result.filter(r => r.type === 'email_thread').length,
      standaloneEmails: standaloneEmails.length,
      cacheKey: cacheKey.slice(0, 50) + '...',
      cached: true,
      performance: {
        algorithmComplexity: 'O(n log n)',
        previousComplexity: 'O(n²)',
        threadsProcessed: threadGroups.size,
      },
    })
  }

  return result
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
  // ✅ PERFORMANCE: Throttling state to prevent excessive executions
  const lastExecutionRef = useRef<number>(0)
  const executionThrottleMs = 100 // Minimum 100ms between executions
  const pendingExecutionRef = useRef<NodeJS.Timeout | null>(null)

  // ✅ PERFORMANCE: Refs for stable values
  const contactIdRef = useRef(options.contactId)
  const contactEmailRef = useRef(options.contactEmail)

  // Update refs when props change
  useEffect(() => {
    contactIdRef.current = options.contactId
    contactEmailRef.current = options.contactEmail
  }, [options.contactId, options.contactEmail])

  // ✅ PERFORMANCE: Throttled execution wrapper
  const executeWithThrottle = useCallback((fn: () => void) => {
    const now = Date.now()
    const timeSinceLastExecution = now - lastExecutionRef.current

    // Clear any pending execution
    if (pendingExecutionRef.current) {
      clearTimeout(pendingExecutionRef.current)
      pendingExecutionRef.current = null
    }

    if (timeSinceLastExecution >= executionThrottleMs) {
      // Execute immediately
      lastExecutionRef.current = now
      fn()
    } else {
      // Schedule execution after throttle period
      const delay = executionThrottleMs - timeSinceLastExecution
      pendingExecutionRef.current = setTimeout(() => {
        lastExecutionRef.current = Date.now()
        pendingExecutionRef.current = null
        fn()
      }, delay)
    }
  }, [])

  // Cleanup pending executions on unmount
  useEffect(() => {
    return () => {
      if (pendingExecutionRef.current) {
        clearTimeout(pendingExecutionRef.current)
        pendingExecutionRef.current = null
      }
    }
  }, [])

  console.log('🔍 [useTimelineActivitiesV2] Hook called with:', {
    contactId: contactIdRef.current,
    contactEmail: contactEmailRef.current,
    includeEmails: options.includeEmails,
    autoInitialize: options.autoInitialize,
    options,
  })

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
  } = useActivities(contactIdRef.current)

  // Get emails from new Zustand store
  const emails = useEmails()

  // Extract stable functions to avoid useEffect re-runs
  const { getEmailsForContact, getLoadingState, initializeContactEmails } = emails

  // Initialize emails for this contact if needed - MOVED TO useEffect to prevent render-time setState
  useEffect(() => {
    if (!options.autoInitialize || !options.includeEmails || !contactEmailRef.current || !authUser?.id) {
      console.log('🔍 [useTimelineActivitiesV2] Skipping initialization:', {
        autoInitialize: options.autoInitialize,
        includeEmails: options.includeEmails,
        contactEmail: contactEmailRef.current,
        authUserId: authUser?.id,
      })
      return
    }

    // Check if we already initialized this contact
    const initKey = `${contactEmailRef.current}-${authUser.id}`
    if (initializedContactsRef.current.has(initKey)) {
      console.log('🔍 [useTimelineActivitiesV2] Already initialized:', initKey)
      return
    }

    // Get current state to decide if initialization is needed
    const contactEmails = getEmailsForContact(contactEmailRef.current)
    const loading = getLoadingState(contactEmailRef.current)

    console.log('🔍 [useTimelineActivitiesV2] Checking initialization need:', {
      contactEmail: contactEmailRef.current,
      currentEmailsCount: contactEmails.length,
      loading,
      shouldInitialize: contactEmails.length === 0 && !loading,
    })

    if (contactEmails.length === 0 && !loading) {
      console.log('🔄 [useTimelineActivitiesV2] Initializing emails for contact:', contactEmailRef.current)
      initializedContactsRef.current.add(initKey)
      initializeContactEmails(contactEmailRef.current, authUser.id)
    }
  }, [
    options.autoInitialize,
    options.includeEmails,
    contactEmailRef.current,
    authUser?.id,
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
  const contactEmails = contactEmailRef.current ? getEmailsForContact(contactEmailRef.current) : []
  const emailsLoading = contactEmailRef.current ? getLoadingState(contactEmailRef.current) : false
  const emailsLoadingMore = contactEmailRef.current ? getLoadingMoreState(contactEmailRef.current) : false
  const hasMoreEmails = contactEmailRef.current ? hasMoreEmailsFn(contactEmailRef.current) : false
  const syncStatus = contactEmailRef.current ? getSyncState(contactEmailRef.current) : 'idle'

  console.log('🔍 [useTimelineActivitiesV2] Email data state:', {
    contactEmail: contactEmailRef.current,
    contactEmailsCount: contactEmails.length,
    emailsLoading,
    syncStatus,
    hasMoreEmails,
    authUserId: authUser?.id,
    firstTwoEmails: contactEmails.slice(0, 2).map(email => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      date: email.date,
    })),
  })

  // Get pinned emails
  const { isEmailPinned } = usePinnedEmails(contactEmailRef.current)

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
        details: activity.details || undefined, // Include details for emails sent from CRM

        // Extract email fields for email_sent activities
        ...(activity.type === 'email_sent' && activity.details?.email_content
          ? {
              subject: activity.details.email_content.subject,
              bodyHtml: activity.details.email_content.bodyHtml,
              bodyText: activity.details.email_content.bodyText,
              to: activity.details.email_content.to,
              cc: activity.details.email_content.cc,
              bcc: activity.details.email_content.bcc,
              from: activity.details.email_content.from,
            }
          : {}),
      }

      ACTIVITY_TRANSFORM_CACHE.set(cacheKey, transformed)

      if (ACTIVITY_TRANSFORM_CACHE.size > 1000) {
        ACTIVITY_TRANSFORM_CACHE.clear()
      }

      return transformed
    })
  }, [internalActivities])

  // Transform email activities and group by threads
  const timelineEmailActivities: TimelineActivity[] = useMemo(() => {
    if (!options.includeEmails || !contactEmails.length) return []

    // First, transform individual emails to TimelineActivity format
    const individualEmailActivities = contactEmails.map((email: GmailEmail) => {
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
        threadId: email.threadId,
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

    // ✅ NEW: Group emails by threadId to create email threads
    const groupedEmailActivities = groupEmailsByThread(individualEmailActivities)

    console.log('🔗 [useTimelineActivitiesV2] Email threading results:', {
      originalEmails: individualEmailActivities.length,
      afterGrouping: groupedEmailActivities.length,
      threads: groupedEmailActivities.filter(a => a.type === 'email_thread').length,
      standaloneEmails: groupedEmailActivities.filter(a => a.type === 'email').length,
      threadDetails: groupedEmailActivities
        .filter(a => a.type === 'email_thread')
        .map(thread => ({
          threadId: thread.threadId,
          emailCount: thread.threadEmailCount,
          subject: thread.subject,
          latestFrom: thread.latestEmail?.from?.email,
        })),
    })

    return groupedEmailActivities
  }, [contactEmails, options.includeEmails, isEmailPinned])

  // Combine and sort all activities
  const allActivities = useMemo(() => {
    const combined = [...timelineInternalActivities, ...timelineEmailActivities]
    const sorted = sortActivitiesByPriorityAndDate(combined)

    console.log('🔍 [useTimelineActivitiesV2] Final activities combined:', {
      internalCount: timelineInternalActivities.length,
      emailCount: timelineEmailActivities.length,
      totalCombined: combined.length,
      finalSorted: sorted.length,
      firstThreeActivities: sorted.slice(0, 3).map(activity => ({
        id: activity.id,
        type: activity.type,
        source: activity.source,
        timestamp: activity.timestamp,
        subject: activity.subject || 'N/A',
      })),
    })

    return sorted
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
    if (contactEmailRef.current) {
      await loadMoreEmailsFn(contactEmailRef.current)
    }
  }, [loadMoreEmailsFn])

  const syncEmailHistory = useCallback(async () => {
    if (contactEmailRef.current && authUser?.id) {
      await syncContactHistoryFn(contactEmailRef.current, authUser.id)
    }
  }, [contactEmailRef.current, authUser?.id, syncContactHistoryFn])

  const refreshEmails = useCallback(async () => {
    if (contactEmailRef.current && authUser?.id) {
      await refreshContactEmailsFn(contactEmailRef.current, authUser.id)
    }
  }, [contactEmailRef.current, authUser?.id, refreshContactEmailsFn])

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
