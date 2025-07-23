import { useCallback, useEffect, useRef, useState } from 'react'
import TimelineComposer from './TimelineComposer'
import TimelineItem from './TimelineItem'
// Note: Timeline debug utilities are loaded globally in main.tsx
import { useAuth } from '@/components/auth'
import { useActivities } from '@/hooks/supabase/use-activities'
import { usePinnedEmails } from '@/hooks/supabase/use-pinned-emails'
import { useTimelineActivitiesV2 } from '@/hooks/use-timeline-activities-v2'
// ✅ CRITICAL FIX: Add Gmail sync for new emails
import { useContactEmailSync } from '@/hooks/use-contact-email-sync'
import { Loader2, Mail, RefreshCw, Users } from 'lucide-react'

interface StreamTimelineProps {
  contactId: string
  contactEmail: string
  contactName?: string
}

// ✅ PERFORMANCE: Custom hook for throttled scroll handling - FIXED to prevent recreation
const useThrottledScroll = (callback: (...args: any[]) => void, delay: number = 16) => {
  const timeoutRef = useRef<number | null>(null)
  const lastExecRef = useRef<number>(0)
  const callbackRef = useRef(callback)

  // ✅ FIX: Keep callback reference stable
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    (...args: any[]) => {
      const now = Date.now()

      // If enough time has passed since last execution, execute immediately
      if (now - lastExecRef.current >= delay) {
        lastExecRef.current = now
        callbackRef.current(...args)
        return
      }

      // Otherwise, schedule execution
      if (timeoutRef.current) {
        cancelAnimationFrame(timeoutRef.current)
      }

      timeoutRef.current = requestAnimationFrame(() => {
        lastExecRef.current = Date.now()
        callbackRef.current(...args)
        timeoutRef.current = null
      })
    },
    [delay],
  ) // ✅ FIX: Remove callback from dependencies
}

// ✅ PERFORMANCE: Debounced infinite scroll to prevent multiple triggers - FIXED dependencies
const useDebouncedInfiniteScroll = (
  loadMoreEmails: () => Promise<void>,
  hasMoreEmails: boolean,
  loadingMore: boolean,
  onOptimisticLoadingStart?: () => void, // ✅ NEW: Callback for immediate UX feedback
  threshold: number = 200, // Increased from 100px to 200px
) => {
  const lastTriggerRef = useRef<number>(0)
  const triggerCooldown = 1000 // 1 second cooldown between triggers
  const loadMoreRef = useRef(loadMoreEmails)
  const optimisticCallbackRef = useRef(onOptimisticLoadingStart)

  // ✅ FIX: Keep function references stable
  useEffect(() => {
    loadMoreRef.current = loadMoreEmails
    optimisticCallbackRef.current = onOptimisticLoadingStart
  }, [loadMoreEmails, onOptimisticLoadingStart])

  return useCallback(() => {
    const now = Date.now()

    // Check cooldown to prevent rapid firing
    if (now - lastTriggerRef.current < triggerCooldown) {
      return false
    }

    if (hasMoreEmails && !loadingMore) {
      lastTriggerRef.current = now

      // ✅ IMMEDIATE UX: Show loading state optimistically BEFORE async operation
      if (optimisticCallbackRef.current) {
        optimisticCallbackRef.current()
      }

      // Trigger loading more emails

      loadMoreRef.current()
      return true
    }

    return false
  }, [hasMoreEmails, loadingMore]) // ✅ FIX: Stable dependencies only
}

export function StreamTimeline({ contactId, contactEmail, contactName }: StreamTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const [isCompact, setIsCompact] = useState(false)

  // ✅ OPTIMIZATION: Add optimistic loading state for immediate UX feedback
  const [isOptimisticallyLoading, setIsOptimisticallyLoading] = useState(false)

  // ✅ CRITICAL FIX: Add Gmail email sync for new emails
  const { syncContactEmails, syncState } = useContactEmailSync()

  // ✅ PERFORMANCE: Aggressive throttling to prevent excessive renders
  const lastRenderTime = useRef<number>(0)
  const renderThrottleMs = 500 // Minimum 500ms between renders
  const [throttledProps, setThrottledProps] = useState({ contactId, contactEmail, contactName })

  // ✅ PERFORMANCE: Only update props if enough time has passed or if contact changed
  useEffect(() => {
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current

    // Always update if contact changed, otherwise throttle
    const contactChanged = throttledProps.contactId !== contactId || throttledProps.contactEmail !== contactEmail

    if (contactChanged || timeSinceLastRender >= renderThrottleMs) {
      lastRenderTime.current = now
      setThrottledProps({ contactId, contactEmail, contactName })
    }
  }, [contactId, contactEmail, contactName, throttledProps])

  // Auto-sync emails when contact changes
  useEffect(() => {
    if (contactEmail && user?.id) {
      // Start Gmail sync immediately in parallel with database loading
      syncContactEmails(contactEmail, {
        silent: false, // ✅ FIX: Show loading states so user knows emails are syncing
        showToast: false, // Keep toasts minimal, but show loading indicators
        forceFullSync: false, // Use cache if recent
      }).catch(error => {
        console.error('Auto-sync failed:', error)
      })
    }
  }, [contactEmail, user?.id, syncContactEmails])

  // ✅ PERFORMANCE: Use throttled props instead of direct props
  const {
    activities,
    loading,
    error,
    loadMoreEmails,
    hasMoreEmails,
    loadingMore,
    refreshEmails,
    syncEmailHistory,
    emailsCount,
    internalCount,
    syncStatus,
    oldestEmailDate,
  } = useTimelineActivitiesV2({
    contactId: throttledProps.contactId,
    contactEmail: throttledProps.contactEmail,
    includeEmails: true,
    autoInitialize: true,
  })

  // ✅ UNIFIED LOADING: Combine both loading states (after destructuring)
  const isLoadingTimeline = loading || syncState.isLoading
  const hasTimelineError = error || syncState.error

  // Reset optimistic loading when real loading finishes
  useEffect(() => {
    if (!loadingMore && isOptimisticallyLoading) {
      // Add small delay to prevent flickering
      const timer = setTimeout(() => {
        setIsOptimisticallyLoading(false)
      }, 300) // 300ms delay for smooth UX

      return () => clearTimeout(timer)
    }
  }, [loadingMore, isOptimisticallyLoading])

  // ✅ SMART LOADING MESSAGE: Show context-aware loading text
  const getLoadingMessage = () => {
    if (loading && syncState.isLoading) {
      return 'Loading timeline and syncing emails...'
    }
    if (loading) {
      return 'Loading timeline...'
    }
    if (syncState.isLoading) {
      return 'Syncing latest emails...'
    }
    return 'Loading...'
  }

  // Performance monitoring (debug mode only)
  // const logOnceRef = useRef<Set<string>>(new Set())
  // const debugLogKey = `${throttledProps.contactId}-${activities.length}`

  // Get toggle pin function from activities hook
  const { togglePin, editActivity, deleteActivity } = useActivities(contactId)

  // Get email pin functions
  const { toggleEmailPin } = usePinnedEmails(contactEmail)

  // ✅ PERFORMANCE: Debounced infinite scroll trigger
  const triggerInfiniteScroll = useDebouncedInfiniteScroll(
    loadMoreEmails,
    hasMoreEmails,
    loadingMore,
    () => {
      // Show optimistic loading immediately
      setIsOptimisticallyLoading(true)
    },
    200, // 200px threshold instead of 100px
  )

  // ✅ PERFORMANCE: Refs for scroll handler stability
  const isCompactRef = useRef(isCompact)
  const hasMoreEmailsRef = useRef(hasMoreEmails)
  const loadingMoreRef = useRef(loadingMore)
  const triggerInfiniteScrollRef = useRef(triggerInfiniteScroll)

  // Update refs when values change
  useEffect(() => {
    isCompactRef.current = isCompact
  }, [isCompact])

  useEffect(() => {
    hasMoreEmailsRef.current = hasMoreEmails
    loadingMoreRef.current = loadingMore
  }, [hasMoreEmails, loadingMore])

  useEffect(() => {
    triggerInfiniteScrollRef.current = triggerInfiniteScroll
  }, [triggerInfiniteScroll])

  // ✅ PERFORMANCE: Optimized scroll handler with throttling - STABLE DEPENDENCIES
  const handleScroll = useCallback(() => {
    if (!timelineRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = timelineRef.current

    // Make composer compact after 50px scroll - but avoid unnecessary re-renders
    const shouldBeCompact = scrollTop > 50
    if (shouldBeCompact !== isCompactRef.current) {
      setIsCompact(shouldBeCompact)
    }

    // Check for infinite scroll trigger - only if we have more content to load
    if (hasMoreEmailsRef.current && !loadingMoreRef.current) {
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 300 // Increased threshold for better UX
      if (nearBottom) {
        triggerInfiniteScrollRef.current()

        // Prevent over-scrolling by ensuring we don't go past the content
        const maxScroll = scrollHeight - clientHeight
        if (scrollTop > maxScroll) {
          timelineRef.current?.scrollTo({
            top: maxScroll,
            behavior: 'smooth',
          })
        }
      }
    }
  }, []) // ✅ FIX: No dependencies - use refs

  // ✅ PERFORMANCE: Apply throttling to scroll handler
  const throttledHandleScroll = useThrottledScroll(handleScroll, 16) // ~60fps

  // ✅ DEBUG: Log re-renders to detect infinite loops
  const renderCountRef = useRef(0)
  useEffect(() => {
    renderCountRef.current += 1
    // Removed excessive logging for better performance
  })

  useEffect(() => {
    const timelineElement = timelineRef.current
    if (timelineElement) {
      // Use passive listener for better performance
      timelineElement.addEventListener('scroll', throttledHandleScroll, { passive: true })
      return () => timelineElement.removeEventListener('scroll', throttledHandleScroll)
    }
  }, [throttledHandleScroll])

  // ✅ PERFORMANCE: Stable references for activities-dependent functions
  const activitiesRef = useRef(activities)
  const togglePinRef = useRef(togglePin)
  const toggleEmailPinRef = useRef(toggleEmailPin)
  const editActivityRef = useRef(editActivity)
  const deleteActivityRef = useRef(deleteActivity)

  // ✅ PERFORMANCE: Update refs when values change
  useEffect(() => {
    activitiesRef.current = activities
  }, [activities])

  useEffect(() => {
    togglePinRef.current = togglePin
    toggleEmailPinRef.current = toggleEmailPin
  }, [togglePin, toggleEmailPin])

  useEffect(() => {
    editActivityRef.current = editActivity
    deleteActivityRef.current = deleteActivity
  }, [editActivity, deleteActivity])

  // ✅ PERFORMANCE: Memoized user name extraction function - STABLE
  const getUserName = useCallback((activity: any) => {
    // For Gmail emails, use the from field
    if (activity.source === 'gmail' && activity.from) {
      if (activity.from.name && activity.from.name.trim()) {
        return activity.from.name
      }
      // Extract readable name from email
      const emailPart = activity.from.email.split('@')[0]
      const cleanName = emailPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      return cleanName || activity.from.email
    }

    // For internal activities (notes, emails sent from CRM, etc.)
    // Try to get a better name from user metadata or email
    const userFullName = user?.user_metadata?.full_name
    if (userFullName && userFullName.trim()) {
      return userFullName
    }

    // Extract readable name from user email
    if (user?.email) {
      const emailPart = user.email.split('@')[0]
      const cleanName = emailPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
      return cleanName || user.email
    }

    return 'Usuario'
  }, []) // ✅ FIX: No dependencies - access user from closure

  // ✅ PERFORMANCE: Memoized first interaction date calculation - STABLE
  const getFirstInteractionDate = useCallback(() => {
    const currentActivities = activitiesRef.current
    if (currentActivities.length === 0) return null

    // Get the oldest activity
    const oldestActivity = currentActivities[currentActivities.length - 1]
    if (!oldestActivity) return null

    try {
      return new Date(oldestActivity.timestamp)
    } catch (error) {
      return null
    }
  }, []) // ✅ FIX: No dependencies - use ref

  // ✅ FIX: Separate functions for date formatting
  const formatFirstInteractionDateSpanish = useCallback((date: Date) => {
    try {
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch (error) {
      return 'Fecha inválida'
    }
  }, [])

  const formatFirstInteractionDateEnglish = useCallback((date: Date) => {
    try {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }, [])

  // Handle expand composer
  const handleExpandComposer = useCallback(() => {
    setIsCompact(false)
    // Scroll to top to show full composer
    if (timelineRef.current) {
      timelineRef.current.scrollTop = 0
    }
  }, [])

  // ✅ PERFORMANCE: Memoized pin toggle handler
  const handleTogglePin = useCallback((activityId: string, newPinState: boolean) => {
    // Find the activity to verify it exists
    const activity = activitiesRef.current.find(a => a.id === activityId)

    if (!activity) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Activity not found for ID:', activityId)
      }
      return
    }

    if (activity.source === 'internal') {
      // Handle internal activity pin
      togglePinRef.current({ activityId, isPinned: newPinState })
    } else if (activity.source === 'gmail' && activity.type === 'email') {
      // Handle Gmail email pin - activityId is already the Gmail ID
      toggleEmailPinRef.current({ emailId: activityId, isPinned: newPinState })
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error('Cannot pin this type of activity:', activity)
      }
    }
  }, []) // ✅ FIX: No dependencies - use refs

  // ✅ PERFORMANCE: Memoized edit activity handler
  const handleEditActivity = useCallback((activityId: string, newContent: string) => {
    // Find the activity to verify it exists
    const activity = activitiesRef.current.find(a => a.id === activityId)

    if (!activity) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Activity not found for ID:', activityId)
      }
      return
    }

    if (activity.source !== 'internal') {
      if (process.env.NODE_ENV === 'development') {
        console.error('Cannot edit non-internal activity:', activity)
      }
      return
    }

    editActivityRef.current({ activityId, content: newContent })
  }, []) // ✅ FIX: No dependencies - use refs

  // ✅ PERFORMANCE: Memoized delete activity handler
  const handleDeleteActivity = useCallback((activityId: string) => {
    // Find the activity to verify it exists
    const activity = activitiesRef.current.find(a => a.id === activityId)

    if (!activity) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Activity not found for ID:', activityId)
      }
      return
    }

    if (activity.source !== 'internal') {
      if (process.env.NODE_ENV === 'development') {
        console.error('Cannot delete non-internal activity:', activity)
      }
      return
    }

    deleteActivityRef.current(activityId)
  }, []) // ✅ FIX: No dependencies - use refs

  return (
    <div className="flex flex-col h-full  overflow-y-hidden">
      {/* Timeline composer */}
      <div className="flex-shrink-0 p-4 pt-0">
        <TimelineComposer
          contactId={contactId}
          contactEmail={contactEmail}
          isCompact={isCompact}
          onExpand={handleExpandComposer}
          onSyncEmailHistory={syncEmailHistory}
          syncStatus={syncStatus}
          emailsCount={emailsCount}
          hasMoreEmails={hasMoreEmails}
        />
      </div>

      {/* Timeline content */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto p-4 mb-[120px] pl-12 pr-5 scroll-smooth">
        {/* ✅ MINIMAL: Subtle loading indicator for existing timeline */}
        {isLoadingTimeline && activities.length > 0 && (
          <div className="flex items-center justify-center py-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full text-xs text-blue-600">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Loading...'}</span>
            </div>
          </div>
        )}

        {/* ✅ MINIMAL: Clean loading indicator for other cases */}
        {isLoadingTimeline && activities.length === 0 && !syncStatus && (
          <div className="flex items-center justify-center py-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        )}

        {/* ✅ NEW: Unified error indicator */}
        {hasTimelineError && (
          <div className="flex items-center justify-center py-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm text-red-700">⚠️ {hasTimelineError}</span>
          </div>
        )}

        {/* ✅ MINIMAL: Subtle initial loading state */}
        {isLoadingTimeline && activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading timeline...</span>
            </div>
          </div>
        ) : !isLoadingTimeline && activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              <Mail className="w-12 h-12 mx-auto text-gray-300" />
            </div>
            <p className="text-lg font-medium">No hay actividades</p>
            <p className="text-sm">Las actividades aparecerán aquí una vez que las agregues</p>
          </div>
        ) : (
          <>
            <ul className="space-y-0">
              {activities.map((activity, index) => {
                // Check if we need to show a separator between pinned and unpinned activities
                const showSeparator = index > 0 && activities[index - 1].is_pinned && !activity.is_pinned

                // Check if this is the last activity
                const isLastActivity = index === activities.length - 1

                return (
                  <div key={`${activity.id}-${index}`} className="">
                    {showSeparator && (
                      <li className="relative pl-10 py-4">
                        <div className="flex items-center">
                          <div className="flex-1 border-t border-gray-200"></div>
                          <div className="px-3 text-xs text-gray-500 bg-white">Recent Activities</div>
                          <div className="flex-1 border-t border-gray-200"></div>
                        </div>
                      </li>
                    )}
                    <TimelineItem
                      activity={activity}
                      activityUserName={getUserName(activity)}
                      contactName={contactName}
                      isLast={isLastActivity}
                      onTogglePin={handleTogglePin}
                      onEditActivity={handleEditActivity}
                      onDeleteActivity={handleDeleteActivity}
                    />
                  </div>
                )
              })}

              {/* Conversation start indicator with dynamic info */}
              {getFirstInteractionDate() && (
                <li className="relative pl-10 pb-6 pb-[100px]">
                  {/* Connecting line from timeline to indicator */}
                  <div className="absolute left-[22px] top-0 w-[1px] h-8 bg-gradient-to-b from-transparent to-gray-300"></div>

                  <div className="flex items-center justify-center mt-6">
                    <div className="flex flex-col items-center gap-3">
                      {/* Main relationship indicator */}
                      <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-700 shadow-sm">
                        <div className="w-6 h-6 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-teal-600" />
                        </div>
                        <span className="font-medium">
                          {(() => {
                            const firstDate = getFirstInteractionDate()
                            return firstDate ? formatFirstInteractionDateSpanish(firstDate) : 'Fecha no disponible'
                          })()}
                        </span>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const firstDate = getFirstInteractionDate()
                            return firstDate ? formatFirstInteractionDateEnglish(firstDate) : 'Date not available'
                          })()}
                        </div>
                      </div>

                      {/* Additional info for more emails or sync status */}
                      {hasMoreEmails && !loadingMore && !isOptimisticallyLoading && (
                        <div
                          className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => {
                            setIsOptimisticallyLoading(true)
                            loadMoreEmails()
                          }}
                        >
                          📜 Desliza hacia abajo para cargar más emails (o haz clic aquí)
                        </div>
                      )}

                      {syncStatus === 'syncing' && (
                        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Syncing email history...
                        </div>
                      )}

                      {syncStatus === 'completed' && !hasMoreEmails && (
                        <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                          ✅ All email history synced
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )}
            </ul>

            {/* ✅ MINIMAL: Subtle loading more indicator */}
            {(loadingMore || isOptimisticallyLoading) && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading more...</span>
                </div>
              </div>
            )}

            {/* End of emails indicator */}
            {!hasMoreEmails && activities.length > 0 && emailsCount > 0 && (
              <div className="flex items-center justify-center py-4">
                <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                  All emails loaded • {emailsCount} total emails
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Global debug helper for cleaning logs
if (typeof window !== 'undefined') {
  ;(window as any).clearStreamLogs = () => {
    console.clear()
    console.log('🧹 [StreamTimeline] Logs cleared - infinite scroll optimized')
  }
}

export default StreamTimeline
