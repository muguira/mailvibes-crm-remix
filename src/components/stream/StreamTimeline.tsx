
import  { useRef, useState, useEffect } from 'react';
import TimelineItem from './TimelineItem';
import TimelineComposer from './TimelineComposer';
import { useTimelineActivities } from "@/hooks/use-timeline-activities";
import { useAuth } from "@/components/auth";
import { 
  Loader2, 
  Mail
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
    error,
    activities: activities.slice(0, 3) // Show first 3 activities
  });

  // Get user name for activities
  const getUserName = (activity: any) => {
    if (activity.source === 'gmail' && activity.from) {
      return activity.from.name || activity.from.email;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  // Handle expanding the composer when clicked in compact mode
  const handleExpandComposer = () => {
    if (isCompact && timelineRef.current) {
      timelineRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
        className="flex-1 overflow-y-auto p-4 pl-7"
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
            <ul className="space-y-0 pb-[400px]">
              {activities.map((activity, index) => (
                <TimelineItem 
                  key={`${activity.id}-${index}`}
                  activity={activity}
                  activityUserName={getUserName(activity)}
                  contactName={contactName}
                />
              ))}
            </ul>
            
            {loading && activities.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Cargando más...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default StreamTimeline;