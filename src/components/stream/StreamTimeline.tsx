
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

// ✅ PERFORMANCE: Custom hook for throttled scroll handling
const useThrottledScroll = (callback: (...args: any[]) => void, delay: number = 16) => {
  const timeoutRef = useRef<number | null>(null);
  const lastExecRef = useRef<number>(0);
  
  return useCallback((...args: any[]) => {
    const now = Date.now();
    
    // If enough time has passed since last execution, execute immediately
    if (now - lastExecRef.current >= delay) {
      lastExecRef.current = now;
      callback(...args);
      return;
    }
    
    // Otherwise, schedule execution
    if (timeoutRef.current) {
      cancelAnimationFrame(timeoutRef.current);
    }
    
    timeoutRef.current = requestAnimationFrame(() => {
      lastExecRef.current = Date.now();
      callback(...args);
      timeoutRef.current = null;
    });
  }, [callback, delay]);
};

// ✅ PERFORMANCE: Debounced infinite scroll to prevent multiple triggers
const useDebouncedInfiniteScroll = (
  loadMoreEmails: () => Promise<void>,
  hasMoreEmails: boolean,
  loadingMore: boolean,
  threshold: number = 200 // Increased from 100px to 200px
) => {
  const lastTriggerRef = useRef<number>(0);
  const triggerCooldown = 1000; // 1 second cooldown between triggers
  
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
      
      loadMoreEmails();
      return true;
    }
    
    return false;
  }, [loadMoreEmails, hasMoreEmails, loadingMore, threshold]);
};

export function StreamTimeline({ contactId, contactEmail, contactName }: StreamTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);

  // ✅ PERFORMANCE: Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [StreamTimeline] Component initialized with:', {
      contactId,
      contactEmail,
      contactName,
      propsReceived: { contactId, contactEmail, contactName }
    });
  }

  const {
    activities,
    loading,
    loadingMore,
    error,
    emailsCount,
    internalCount,
    hasMoreEmails,
    syncStatus,
    oldestEmailDate,
    loadMoreEmails,
    syncEmailHistory,
    refreshEmails,
  } = useTimelineActivitiesV2({
    contactId,
    contactEmail,
    includeEmails: true,
    autoInitialize: true,
  });

  // ✅ PERFORMANCE: Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [StreamTimeline] useTimelineActivitiesV2 results:', {
      activitiesCount: activities.length,
      emailsCount,
      internalCount,
      loading,
      error,
      syncStatus,
      hasMoreEmails,
      firstThreeActivities: activities.slice(0, 3).map(activity => ({
        id: activity.id,
        type: activity.type,
        source: activity.source,
        subject: activity.subject || 'N/A'
      }))
    });
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

  // ✅ PERFORMANCE: Optimized scroll handler with throttling
  const handleScroll = useCallback(() => {
    if (!timelineRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = timelineRef.current;
    
    // Make composer compact after 50px scroll - but avoid unnecessary re-renders
    const shouldBeCompact = scrollTop > 50;
    if (shouldBeCompact !== isCompact) {
      setIsCompact(shouldBeCompact);
    }
    
    // Check for infinite scroll trigger - only if we have more content to load
    if (hasMoreEmails && !loadingMore) {
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
      if (nearBottom) {
        triggerInfiniteScroll();
      }
    }
  }, [isCompact, hasMoreEmails, loadingMore, triggerInfiniteScroll]);

  // ✅ PERFORMANCE: Apply throttling to scroll handler
  const throttledHandleScroll = useThrottledScroll(handleScroll, 16); // ~60fps

  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (timelineElement) {
      // Use passive listener for better performance
      timelineElement.addEventListener('scroll', throttledHandleScroll, { passive: true });
      return () => timelineElement.removeEventListener('scroll', throttledHandleScroll);
    }
  }, [throttledHandleScroll]);

  // ✅ PERFORMANCE: Memoized user name extraction function
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
  }, [user?.user_metadata?.full_name, user?.email]);

  // ✅ PERFORMANCE: Memoized first interaction date calculation
  const getFirstInteractionDate = useCallback(() => {
    if (activities.length === 0) return null;
    
    // Get the oldest activity
    const oldestActivity = activities[activities.length - 1];
    if (!oldestActivity) return null;
    
    try {
      const date = new Date(oldestActivity.timestamp);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return null;
    }
  }, [activities]);

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
    const activity = activities.find(a => a.id === activityId);
    
    if (!activity) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Activity not found for ID:', activityId);
      }
      return;
    }
    
    if (activity.source === 'internal') {
      // Handle internal activity pin
      togglePin({ activityId, isPinned: newPinState });
    } else if (activity.source === 'gmail' && activity.type === 'email') {
      // Handle Gmail email pin - activityId is already the Gmail ID
      toggleEmailPin({ emailId: activityId, isPinned: newPinState });
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error('Cannot pin this type of activity:', activity);
      }
    }
  }, [activities, togglePin, toggleEmailPin]);

  // ✅ PERFORMANCE: Memoized edit activity handler
  const handleEditActivity = useCallback((activityId: string, newContent: string) => {
    // Find the activity to verify it exists
    const activity = activities.find(a => a.id === activityId);
    
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
    
    editActivity({ activityId, content: newContent });
  }, [activities, editActivity]);

  // ✅ PERFORMANCE: Memoized delete activity handler
  const handleDeleteActivity = useCallback((activityId: string) => {
    // Find the activity to verify it exists
    const activity = activities.find(a => a.id === activityId);
    
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
    
    deleteActivity(activityId);
  }, [activities, deleteActivity]);

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
                          {getFirstInteractionDate()}
                        </span>
                        <div className="text-xs text-gray-500">
                          {new Date(getFirstInteractionDate()!).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long', 
                            year: 'numeric'
                          })}
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