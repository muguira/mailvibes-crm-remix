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

// ✅ NEW: Group emails by threadId to create email threads
const groupEmailsByThread = (emailActivities: TimelineActivity[]): TimelineActivity[] => {
  if (emailActivities.length === 0) return []

  console.log('🔗 [Timeline] Starting email grouping process:', {
    totalEmails: emailActivities.length,
    emailSubjects: emailActivities.map(e => ({
      id: e.id?.substring(0, 12),
      subject: e.subject,
      threadId: e.threadId,
    })),
  })

  // ✅ ENHANCED: First consolidate emails by subject, then by threadId
  const subjectGroups = new Map<string, TimelineActivity[]>()
  const threadGroups = new Map<string, TimelineActivity[]>()
  const standaloneEmails: TimelineActivity[] = []

  // Step 1: Group by base subject to consolidate conversations
  emailActivities.forEach(email => {
    if (!email.subject) {
      standaloneEmails.push(email)
      return
    }

    // Normalize subject by removing Re: prefixes and trimming
    const baseSubject = email.subject.replace(/^(Re:|RE:|Fwd:|FWD:)\s*/g, '').trim()

    if (!baseSubject) {
      standaloneEmails.push(email)
      return
    }

    if (!subjectGroups.has(baseSubject)) {
      subjectGroups.set(baseSubject, [])
    }
    subjectGroups.get(baseSubject)!.push(email)
  })

  // Step 2: For each subject group, decide how to handle threading
  subjectGroups.forEach((emailsWithSameSubject, baseSubject) => {
    if (emailsWithSameSubject.length === 1) {
      // Single email with this subject
      const email = emailsWithSameSubject[0]
      const threadId = email.threadId

      if (!threadId || threadId === 'optimistic-thread' || threadId === 'reply-thread') {
        standaloneEmails.push(email)
      } else {
        if (!threadGroups.has(threadId)) {
          threadGroups.set(threadId, [])
        }
        threadGroups.get(threadId)!.push(email)
      }
    } else {
      // ✅ FIX: Multiple emails with same subject should NOT be automatically grouped
      // Only group emails if they have the same REAL threadId from Gmail
      // Otherwise, treat each email as standalone even if they have similar subjects

      const emailsByRealThreadId = new Map<string, TimelineActivity[]>()

      emailsWithSameSubject.forEach(email => {
        const realThreadId = email.threadId

        // Only group if they have a valid, non-artificial threadId
        if (
          realThreadId &&
          !realThreadId.includes('optimistic-') &&
          !realThreadId.includes('subject-') &&
          !realThreadId.includes('new-conversation-') &&
          realThreadId !== 'reply-thread'
        ) {
          if (!emailsByRealThreadId.has(realThreadId)) {
            emailsByRealThreadId.set(realThreadId, [])
          }
          emailsByRealThreadId.get(realThreadId)!.push(email)
        } else {
          // Email without real threadId - keep as standalone
          standaloneEmails.push(email)
        }
      })

      // Add emails with real threadIds to thread groups
      emailsByRealThreadId.forEach((emails, threadId) => {
        if (!threadGroups.has(threadId)) {
          threadGroups.set(threadId, [])
        }
        threadGroups.get(threadId)!.push(...emails)
      })

      console.log(`🔗 [Timeline] Processed ${emailsWithSameSubject.length} emails with subject "${baseSubject}"`, {
        realThreadGroups: emailsByRealThreadId.size,
        standaloneFromThisSubject:
          emailsWithSameSubject.length - Array.from(emailsByRealThreadId.values()).flat().length,
        reasoning: 'Only grouping emails with real Gmail threadIds, not creating artificial groups',
      })
    }
  })

  const result: TimelineActivity[] = []

  // Step 3: Process thread groups
  threadGroups.forEach((emailsInThread, threadId) => {
    if (emailsInThread.length === 1) {
      // Single email in thread - keep as individual email
      result.push(emailsInThread[0])
    } else if (emailsInThread.length > 1) {
      // Multiple emails in thread - create thread activity
      // Sort emails in thread chronologically (oldest first for thread display)
      const sortedEmails = emailsInThread.sort(
        (a, b) => getCachedTimestamp(a.timestamp) - getCachedTimestamp(b.timestamp),
      )

      // Find the latest email for the thread summary
      const latestEmail = sortedEmails[sortedEmails.length - 1]

      // Check if any email in thread is pinned
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

  // Add standalone emails
  result.push(...standaloneEmails)

  console.log('🔗 [Timeline] Email grouping completed:', {
    originalEmails: emailActivities.length,
    resultingActivities: result.length,
    threads: result.filter(r => r.type === 'email_thread').length,
    standaloneEmails: standaloneEmails.length,
    threadsDetails: result
      .filter(r => r.type === 'email_thread')
      .map(thread => ({
        threadId: thread.threadId,
        subject: thread.subject,
        emailCount: thread.threadEmailCount,
        emails: thread.emailsInThread?.map(e => ({
          id: e.id?.substring(0, 12),
          originalThreadId: e.threadId,
          subject: e.subject,
        })),
      })),
  })

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
  const { contactId, contactEmail, includeEmails = true, autoInitialize = true } = options

  console.log('🔍 [useTimelineActivitiesV2] Hook called with:', {
    contactId,
    contactEmail,
    includeEmails,
    autoInitialize,
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
  } = useActivities(contactId)

  // Get emails from new Zustand store
  const emails = useEmails()

  // Extract stable functions to avoid useEffect re-runs
  const { getEmailsForContact, getLoadingState, initializeContactEmails } = emails

  // Initialize emails for this contact if needed - MOVED TO useEffect to prevent render-time setState
  useEffect(() => {
    if (!autoInitialize || !includeEmails || !contactEmail || !authUser?.id) {
      console.log('🔍 [useTimelineActivitiesV2] Skipping initialization:', {
        autoInitialize,
        includeEmails,
        contactEmail,
        authUserId: authUser?.id,
      })
      return
    }

    // Check if we already initialized this contact
    const initKey = `${contactEmail}-${authUser.id}`
    if (initializedContactsRef.current.has(initKey)) {
      console.log('🔍 [useTimelineActivitiesV2] Already initialized:', initKey)
      return
    }

    // Get current state to decide if initialization is needed
    const contactEmails = getEmailsForContact(contactEmail)
    const loading = getLoadingState(contactEmail)

    console.log('🔍 [useTimelineActivitiesV2] Checking initialization need:', {
      contactEmail,
      currentEmailsCount: contactEmails.length,
      loading,
      shouldInitialize: contactEmails.length === 0 && !loading,
    })

    if (contactEmails.length === 0 && !loading) {
      console.log('🔄 [useTimelineActivitiesV2] Initializing emails for contact:', contactEmail)
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

  console.log('🔍 [useTimelineActivitiesV2] Email data state:', {
    contactEmail,
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
    if (!includeEmails || !contactEmails.length) return []

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
  }, [contactEmails, includeEmails, isEmailPinned])

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
