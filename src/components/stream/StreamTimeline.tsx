
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

export function StreamTimeline({ contactId, contactEmail, contactName }: StreamTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [isCompact, setIsCompact] = useState(false);

  console.log('🔍 [StreamTimeline] Component initialized with:', {
    contactId,
    contactEmail,
    contactName,
    propsReceived: { contactId, contactEmail, contactName }
  });

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

  // Get toggle pin function from activities hook
  const { togglePin, editActivity, deleteActivity } = useActivities(contactId);
  
  // Get email pin functions
  const { toggleEmailPin } = usePinnedEmails(contactEmail);

  // Handle infinite scroll and composer compact state
  const handleScroll = useCallback(() => {
    if (timelineRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = timelineRef.current;
      
      // Make composer compact after 50px scroll
      setIsCompact(scrollTop > 50);
      
      // Load more emails when near bottom (100px before end)
      const nearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      
      if (nearBottom && hasMoreEmails && !loadingMore) {
        console.log('📜 Near bottom, loading more emails...');
        loadMoreEmails();
      }
    }
  }, [hasMoreEmails, loadingMore, loadMoreEmails]);

  useEffect(() => {
    const timelineElement = timelineRef.current;
    if (timelineElement) {
      timelineElement.addEventListener('scroll', handleScroll);
      return () => timelineElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Debug logging
  // console.log('StreamTimeline Debug:', {
  //   contactId,
  //   contactEmail,
  //   activitiesCount: activities.length,
  //   emailsCount,
  //   internalCount,
  //   loading,
  //   error
  // });

  // Get user name for activities
  const getUserName = (activity: any) => {
    if (activity.source === 'gmail' && activity.from) {
      return activity.from.name || activity.from.email;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Get the first interaction date (dynamic based on loaded emails)
  const getFirstInteractionDate = () => {
    if (activities.length === 0) return null;
    
    // Use oldestEmailDate if available (from database), otherwise calculate from loaded activities
    if (oldestEmailDate) {
      return oldestEmailDate;
    }
    
    // Fallback: Sort activities by timestamp to get the oldest one
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    return sortedActivities[0]?.timestamp;
  };

  // Format the first interaction date
  const formatFirstInteractionDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'contact relationship started today';
    } else if (diffInDays === 1) {
      return 'contact relationship started yesterday';
    } else if (diffInDays < 7) {
      return `contact relationship started ${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `contact relationship started ${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `contact relationship started ${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `contact relationship started ${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  // Handle expanding the composer when clicked in compact mode
  const handleExpandComposer = () => {
    if (isCompact && timelineRef.current) {
      timelineRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle toggle pin for activities
  const handleTogglePin = (activityId: string, newPinState: boolean) => {
    // Find the activity to verify it exists
    const activity = activities.find(a => a.id === activityId);
    
    if (!activity) {
      console.error('Activity not found for ID:', activityId);
      return;
    }
    
    if (activity.source === 'internal') {
      // Handle internal activity pin
      togglePin({ activityId, isPinned: newPinState });
    } else if (activity.source === 'gmail' && activity.type === 'email') {
      // Handle Gmail email pin - activityId is already the Gmail ID
      toggleEmailPin({ emailId: activityId, isPinned: newPinState });
    } else {
      console.error('Cannot pin this type of activity:', activity);
    }
  };

  // Handle edit activity
  const handleEditActivity = (activityId: string, newContent: string) => {
    // Find the activity to verify it exists
    const activity = activities.find(a => a.id === activityId);
    
    if (!activity) {
      console.error('Activity not found for ID:', activityId);
      return;
    }
    
    if (activity.source !== 'internal') {
      console.error('Cannot edit non-internal activity:', activity);
      return;
    }
    
    editActivity({ activityId, content: newContent });
  };

  // Handle delete activity
  const handleDeleteActivity = (activityId: string) => {
    // Find the activity to verify it exists
    const activity = activities.find(a => a.id === activityId);
    
    if (!activity) {
      console.error('Activity not found for ID:', activityId);
      return;
    }
    
    if (activity.source !== 'internal') {
      console.error('Cannot delete non-internal activity:', activity);
      return;
    }
    
    deleteActivity(activityId);
  };

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
                  <div key={`${activity.id}-${index}`} className="last-of-type:overflow-y-hidden">
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
                      {/* Timeline terminus circle */}
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 border-2 border-white shadow-lg relative">
                        <div className="absolute inset-0 rounded-full bg-teal-500 animate-pulse opacity-50"></div>
                      </div>
                      
                      {/* Main relationship indicator */}
                      <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-full px-4 py-2 text-sm text-gray-700 shadow-sm">
                        <div className="w-6 h-6 bg-teal-50 border border-teal-200 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-teal-600" />
                        </div>
                        <span className="font-medium">
                          {formatFirstInteractionDate(getFirstInteractionDate()!)}
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