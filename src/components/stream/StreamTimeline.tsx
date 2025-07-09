
import React, { useState, useEffect, useRef } from 'react';
import TimelineItem from './TimelineItem';
import TimelineComposer from './TimelineComposer';

const TIMELINE_COL_WIDTH = 60;

interface StreamTimelineProps {
  activities?: Array<any>;
  contactId?: string;
}

export default function StreamTimeline({ activities = [], contactId }: StreamTimelineProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      // Consider it scrolled if user has scrolled more than 20px
      setIsScrolled(scrollTop > 20);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleExpand = () => {
    // Scroll back to top to expand the editor
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="bg-slate-light/10 rounded-md h-full flex flex-col">
      {/* Fixed TimelineComposer at the top with animated height */}
      <div className="flex-shrink-0 p-6 pb-0 transition-all duration-300 ease-in-out pb-4">
        <div className="lg:px-12 w-full">
          {/* TimelineComposer only visible on desktop */}
          <div className="hidden lg:block">
            <TimelineComposer 
              contactId={contactId} 
              isCompact={isScrolled} 
              onExpand={handleExpand}
            />
          </div>
        </div>
      </div>
      
      {/* Scrollable activities area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-6 pt-6"
      >
        <div className="lg:px-12 w-full">
          <ul className="flex flex-col">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <TimelineItem key={activity.id} activity={activity} />
              ))
            ) : (
              <li className="text-center py-8 text-slate-medium">
                No activities yet. Start a conversation or add a note.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
