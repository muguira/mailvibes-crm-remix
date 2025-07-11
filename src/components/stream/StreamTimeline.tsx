
import React, { useRef, useState, useEffect } from 'react';
import TimelineItem from './TimelineItem';
import TimelineComposer from './TimelineComposer';
import { useTimelineActivities } from "@/hooks/use-timeline-activities";
import { useActivities } from "@/hooks/supabase/use-activities";
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

  const {
    activities,
    loading,
    error,
    emailsCount,
    internalCount,
  } = useTimelineActivities({
    contactId,
    contactEmail,
    includeEmails: true,
    maxEmails: 20,
  });

  // Get toggle pin function from activities hook
  const { togglePin, editActivity, deleteActivity } = useActivities(contactId);

  // Handle scroll to make composer compact
  useEffect(() => {
    const handleScroll = () => {
      if (timelineRef.current) {
        const scrollTop = timelineRef.current.scrollTop;
        setIsCompact(scrollTop > 50); // Make compact after 50px scroll
      }
    };

    const timelineElement = timelineRef.current;
    if (timelineElement) {
      timelineElement.addEventListener('scroll', handleScroll);
      return () => timelineElement.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Debug logging
  console.log('StreamTimeline Debug:', {
    contactId,
    contactEmail,
    activitiesCount: activities.length,
    emailsCount,
    internalCount,
    loading,
    error
  });

  // Get user name for activities
  const getUserName = (activity: any) => {
    if (activity.source === 'gmail' && activity.from) {
      return activity.from.name || activity.from.email;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Get the first interaction date
  const getFirstInteractionDate = () => {
    if (activities.length === 0) return null;
    
    // Sort activities by timestamp to get the oldest one
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
    
    if (activity.source !== 'internal') {
      console.error('Cannot pin non-internal activity:', activity);
      return;
    }
    
    togglePin({ activityId, isPinned: newPinState });
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
          isCompact={isCompact}
          onExpand={handleExpandComposer}
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

                return (
                  <div key={`${activity.id}-${index}`}>
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
                      onTogglePin={handleTogglePin}
                      onEditActivity={handleEditActivity}
                      onDeleteActivity={handleDeleteActivity}
                    />
                  </div>
                );
              })}
              
              {/* Conversation start indicator */}
              {getFirstInteractionDate() && (
                <li className="relative pl-10 pb-6 pb-[150px]">
                  {/* Timeline line end */}
                  
                  {/* Conversation start indicator */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-600">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-3 h-3 text-gray-500" />
                      </div>
                      <span className="font-medium">
                        {formatFirstInteractionDate(getFirstInteractionDate()!)}
                      </span>
                      <div className="text-xs text-gray-400">
                        {new Date(getFirstInteractionDate()!).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ul>
            
            {loading && activities.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">load  more...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default StreamTimeline;