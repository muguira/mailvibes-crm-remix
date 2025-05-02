import React from 'react';
import TimelineItem from './TimelineItem';
import { sampleActivities } from './sample-activities';

const TIMELINE_COL_WIDTH = 56; // Changed from 60px to 56px

export default function StreamTimeline() {
  return (
    <div className="bg-slate-light/10 p-6 rounded-md w-full">
      {/* Desktop: 2-column grid with 56px gutter and auto-width content */}
      <div className="hidden lg:grid grid-cols-[56px_minmax(0,1fr)] gap-x-0 w-full">
        {/* Left gutter with axis and dots */}
        <div className="relative flex flex-col items-center">
          {/* Vertical dashed line */}
          <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-teal-light/40"></div>
        </div>
        
        {/* Right column with activity cards */}
        <div className="flex flex-col gap-4">
          {sampleActivities.map((activity) => (
            <TimelineItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
      
      {/* Mobile view (unchanged) */}
      <ul className="flex flex-col gap-4 w-full lg:hidden">
        {sampleActivities.map((activity) => (
          <TimelineItem key={activity.id} activity={activity} />
        ))}
      </ul>
    </div>
  );
}
