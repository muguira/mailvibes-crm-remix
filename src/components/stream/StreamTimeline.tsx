
import React, { useRef, useState, useEffect, useCallback } from 'react';
import TimelineItem from './TimelineItem';
import TimelineComposer from './TimelineComposer';
// Note: Timeline debug utilities are loaded globally in main.tsx
import { useTimelineActivitiesV2 } from "@/hooks/use-timeline-activities-v2";
import { useActivities } from "@/hooks/supabase/use-activities";
import { usePinnedEmails } from "@/hooks/supabase/use-pinned-emails";
import { useAuth } from "@/components/auth";
import { 
  Loader2, 
  Mail,
  Calendar,
  Users,
  Pin
} from "lucide-react";

interface StreamTimelineProps {
  contactId: string;
  contactEmail: string;
  contactName?: string;
}

// ✅ PERFORMANCE: Custom hook for throttled scroll handling - FIXED to prevent recreation
const useThrottledScroll = (callback: (...args: any[]) => void, delay: number = 16) => {
  const timeoutRef = useRef<number | null>(null);
  const lastExecRef = useRef<number>(0);
  const callbackRef = useRef(callback);
  
  // ✅ FIX: Keep callback reference stable
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args: any[]) => {
    const now = Date.now();
    
    // If enough time has passed since last execution, execute immediately
    if (now - lastExecRef.current >= delay) {
      lastExecRef.current = now;
      callbackRef.current(...args);
      return;
    }
    
    // Otherwise, schedule execution
    if (timeoutRef.current) {
      cancelAnimationFrame(timeoutRef.current);
    }
    
    timeoutRef.current = requestAnimationFrame(() => {
      lastExecRef.current = Date.now();
      callbackRef.current(...args);
      timeoutRef.current = null;
    });
  }, [delay]); // ✅ FIX: Remove callback from dependencies
};

// ✅ PERFORMANCE: Debounced infinite scroll to prevent multiple triggers - FIXED dependencies
const useDebouncedInfiniteScroll = (
  loadMoreEmails: () => Promise<void>,
  hasMoreEmails: boolean,
  loadingMore: boolean,
  threshold: number = 200 // Increased from 100px to 200px
) => {
  const lastTriggerRef = useRef<number>(0);
  const triggerCooldown = 1000; // 1 second cooldown between triggers
  const loadMoreRef = useRef(loadMoreEmails);
  
  // ✅ FIX: Keep function reference stable
  useEffect(() => {
    loadMoreRef.current = loadMoreEmails;
  }, [loadMoreEmails]);
  
  return useCallback(() => {
    const now = Date.now();
    
    // Check cooldown to prevent rapid firing
    if (now - lastTriggerRef.current < triggerCooldown) {
      return false;
    }
    
    if (hasMoreEmails && !loadingMore) {
      lastTriggerRef.current = now;
      
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('📜 Near bottom, loading more emails...');
      }
      
      loadMoreRef.current();
      return true;
    }
    
    return false;
  }, [hasMoreEmails, loadingMore]); // ✅ FIX: Stable dependencies only
};

export function StreamTimeline({ contactId, contactEmail, contactName }: StreamTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);

  // ✅ PERFORMANCE: Aggressive throttling to prevent excessive renders
  const lastRenderTime = useRef<number>(0);
  const renderThrottleMs = 500; // Minimum 500ms between renders
  const [throttledProps, setThrottledProps] = useState({ contactId, contactEmail, contactName });
  
  // ✅ PERFORMANCE: Only update props if enough time has passed or if contact changed
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    // Always update if contact changed, otherwise throttle
    const contactChanged = throttledProps.contactId !== contactId || throttledProps.contactEmail !== contactEmail;
    
    if (contactChanged || timeSinceLastRender >= renderThrottleMs) {
      lastRenderTime.current = now;
      setThrottledProps({ contactId, contactEmail, contactName });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [StreamTimeline] Props updated:', {
          contactChanged,
          timeSinceLastRender,
          newProps: { contactId, contactEmail, contactName }
        });
      }
    }
  }, [contactId, contactEmail, contactName, throttledProps]);

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
  });

  // ✅ PERFORMANCE: Only log once per contact or significant changes
  const logOnceRef = useRef<Set<string>>(new Set());
  const debugLogKey = `${throttledProps.contactId}-${activities.length}`;
  
  if (process.env.NODE_ENV === 'development' && !logOnceRef.current.has(debugLogKey)) {
    console.log('🔍 [StreamTimeline] useTimelineActivitiesV2 results:', {
      activitiesCount: activities.length,
      emailsCount,
      internalCount,
      loading,
      error,
      hasMoreEmails,
      loadingMore,
      syncStatus,
      throttledContactId: throttledProps.contactId,
      throttledContactEmail: throttledProps.contactEmail,
    });
    logOnceRef.current.add(debugLogKey);
  }

  // Get toggle pin function from activities hook
  const { togglePin, editActivity, deleteActivity } = useActivities(contactId);
  
  // Get email pin functions
  const { toggleEmailPin } = usePinnedEmails(contactEmail);

  // ✅ PERFORMANCE: Debounced infinite scroll trigger
  const triggerInfiniteScroll = useDebouncedInfiniteScroll(
    loadMoreEmails,
    hasMoreEmails,
    loadingMore,
    200 // 200px threshold instead of 100px
  );

  // ✅ PERFORMANCE: Refs for scroll handler stability
  const isCompactRef = useRef(isCompact);
  const hasMoreEmailsRef = useRef(hasMoreEmails);
  const loadingMoreRef = useRef(loadingMore);
  const triggerInfiniteScrollRef = useRef(triggerInfiniteScroll);

  // Update refs when values change
  useEffect(() => {
    isCompactRef.current = isCompact;
  }, [isCompact]);

  useEffect(() => {
    hasMoreEmailsRef.current = hasMoreEmails;
    loadingMoreRef.current = loadingMore;
  }, [hasMoreEmails, loadingMore]);

  useEffect(() => {
    triggerInfiniteScrollRef.current = triggerInfiniteScroll;
  }, [triggerInfiniteScroll]);

  // ✅ PERFORMANCE: Optimized scroll handler with throttling - STABLE DEPENDENCIES
  const handleScroll = useCallback(() => {
    if (!timelineRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = timelineRef.current;
    
    // Make composer compact after 50px scroll - but avoid unnecessary re-renders
    const shouldBeCompact = scrollTop > 50;
    if (shouldBeCompact !== isCompactRef.current) {
      setIsCompact(shouldBeCompact);
    }
    
    // Check for infinite scroll trigger - only if we have more content to load
    if (hasMoreEmailsRef.current && !loadingMoreRef.current) {
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
      if (nearBottom) {
        triggerInfiniteScrollRef.current();
      }
    }
  }, []); // ✅ FIX: No dependencies - use refs

  // ✅ PERFORMANCE: Apply throttling to scroll handler
  const throttledHandleScroll = useThrottledScroll(handleScroll, 16); // ~60fps

  // ✅ DEBUG: Log re-renders to detect infinite loops
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current += 1;
    if (process.env.NODE_ENV === 'development' && renderCountRef.current > 5) {
      console.warn(`🔄 [StreamTimeline] High render count: ${renderCountRef.current} for contact: ${contactEmail}`);
    }
  });

  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (timelineElement) {
      // Use passive listener for better performance
      timelineElement.addEventListener('scroll', throttledHandleScroll, { passive: true });
      return () => timelineElement.removeEventListener('scroll', throttledHandleScroll);
    }
  }, [throttledHandleScroll]);

  // ✅ PERFORMANCE: Stable references for activities-dependent functions
  const activitiesRef = useRef(activities);
  const togglePinRef = useRef(togglePin);
  const toggleEmailPinRef = useRef(toggleEmailPin);
  const editActivityRef = useRef(editActivity);
  const deleteActivityRef = useRef(deleteActivity);

  // ✅ PERFORMANCE: Update refs when values change
  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  useEffect(() => {
    togglePinRef.current = togglePin;
    toggleEmailPinRef.current = toggleEmailPin;
  }, [togglePin, toggleEmailPin]);

  useEffect(() => {
    editActivityRef.current = editActivity;
    deleteActivityRef.current = deleteActivity;
  }, [editActivity, deleteActivity]);

  // ✅ PERFORMANCE: Memoized user name extraction function - STABLE
  const getUserName = useCallback((activity: any) => {
    // For Gmail emails, use the from field
    if (activity.source === 'gmail' && activity.from) {
      if (activity.from.name && activity.from.name.trim()) {
        return activity.from.name;
      }
      // Extract readable name from email
      const emailPart = activity.from.email.split('@')[0];
      const cleanName = emailPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return cleanName || activity.from.email;
    }
    
    // For internal activities (notes, emails sent from CRM, etc.)
    // Try to get a better name from user metadata or email
    const userFullName = user?.user_metadata?.full_name;
    if (userFullName && userFullName.trim()) {
      return userFullName;
    }
    
    // Extract readable name from user email
    if (user?.email) {
      const emailPart = user.email.split('@')[0];
      const cleanName = emailPart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return cleanName || user.email;
    }
    
    return 'Usuario';
  }, []); // ✅ FIX: No dependencies - access user from closure

  // ✅ PERFORMANCE: Memoized first interaction date calculation - STABLE
  const getFirstInteractionDate = useCallback(() => {
    const currentActivities = activitiesRef.current;
    if (currentActivities.length === 0) return null;
    
    // Get the oldest activity
    const oldestActivity = currentActivities[currentActivities.length - 1];
    if (!oldestActivity) return null;
    
    try {
      return new Date(oldestActivity.timestamp);
    } catch (error) {
      return null;
    }
  }, []); // ✅ FIX: No dependencies - use ref

  // ✅ FIX: Separate functions for date formatting
  const formatFirstInteractionDateSpanish = useCallback((date: Date) => {
    try {
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }, []);

  const formatFirstInteractionDateEnglish = useCallback((date: Date) => {
    try {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long', 
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }, []);

  // Handle expand composer
  const handleExpandComposer = useCallback(() => {
    setIsCompact(false);
    // Scroll to top to show full composer
    if (timelineRef.current) {
      timelineRef.current.scrollTop = 0;
    }
  }, []);

  // ✅ PERFORMANCE: Memoized pin toggle handler
  const handleTogglePin = useCallback((activityId: string, newPinState: boolean) => {
    // Find the activity to verify it exists
    const activity = activitiesRef.current.find(a => a.id === activityId);
    
    if (!activity) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Activity not found for ID:', activityId);
      }
      return;
    }
    
    if (activity.source === 'internal') {
      // Handle internal activity pin
      togglePinRef.current({ activityId, isPinned: newPinState });
    } else if (activity.source === 'gmail' && activity.type === 'email') {
      // Handle Gmail email pin - activityId is already the Gmail ID
      toggleEmailPinRef.current({ emailId: activityId, isPinned: newPinState });
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error('Cannot pin this type of activity:', activity);
      }
    }
  }, []); // ✅ FIX: No dependencies - use refs

  // ✅ PERFORMANCE: Memoized edit activity handler
  const handleEditActivity = useCallback((activityId: string, newContent: string) => {
    // Find the activity to verify it exists
    const activity = activitiesRef.current.find(a => a.id === activityId);
    
    if (!activity) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Activity not found for ID:', activityId);
      }
      return;
    }
    
    if (activity.source !== 'internal') {
      if (process.env.NODE_ENV === 'development') {
        console.error('Cannot edit non-internal activity:', activity);
      }
      return;
    }
    
    editActivityRef.current({ activityId, content: newContent });
  }, []); // ✅ FIX: No dependencies - use refs

  // ✅ PERFORMANCE: Memoized delete activity handler
  const handleDeleteActivity = useCallback((activityId: string) => {
    // Find the activity to verify it exists
    const activity = activitiesRef.current.find(a => a.id === activityId);
    
    if (!activity) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Activity not found for ID:', activityId);
      }
      return;
    }
    
    if (activity.source !== 'internal') {
      if (process.env.NODE_ENV === 'development') {
        console.error('Cannot delete non-internal activity:', activity);
      }
      return;
    }
    
    deleteActivityRef.current(activityId);
  }, []); // ✅ FIX: No dependencies - use refs

  return (
    <div className="flex flex-col h-full">
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
      <div 
        ref={timelineRef}
        className="flex-1 overflow-y-auto p-4 pl-12 pr-5"
      >
        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Cargando actividades...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              <Mail className="w-12 h-12 mx-auto text-gray-300" />
            </div>
            <p className="text-lg font-medium">No hay actividades</p>
            <p className="text-sm">
              Las actividades aparecerán aquí una vez que las agregues
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-0">
              {activities.map((activity, index) => {
                // Check if we need to show a separator between pinned and unpinned activities
                const showSeparator = index > 0 && 
                  activities[index - 1].is_pinned && 
                  !activity.is_pinned;
                
                // Check if this is the last activity
                const isLastActivity = index === activities.length - 1;

                return (
                  <div key={`${activity.id}-${index}`} className="">
                    {showSeparator && (
                      <li className="relative pl-10 py-4">
                        <div className="flex items-center">
                          <div className="flex-1 border-t border-gray-200"></div>
                          <div className="px-3 text-xs text-gray-500 bg-white">
                            Recent Activities
                          </div>
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
                );
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
                            const firstDate = getFirstInteractionDate();
                            return firstDate ? formatFirstInteractionDateSpanish(firstDate) : 'Fecha no disponible';
                          })()}
                        </span>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const firstDate = getFirstInteractionDate();
                            return firstDate ? formatFirstInteractionDateEnglish(firstDate) : 'Date not available';
                          })()}
                        </div>
                      </div>
                      
                      {/* Additional info for more emails or sync status */}
                      {hasMoreEmails && (
                        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                          📜 Scroll down for more emails
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
            
            {/* Loading more emails indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Loading more emails...</span>
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
  );
}

export default StreamTimeline;