
import React from 'react';
import TimelineItem from './TimelineItem';
import TimelineComposer from './TimelineComposer';

const TIMELINE_COL_WIDTH = 60;

interface StreamTimelineProps {
  activities?: Array<any>;
}

export default function StreamTimeline({ activities = [] }: StreamTimelineProps) {
  return (
    <div className="bg-slate-light/10 p-6 rounded-md h-full">
      {/* Added lg:px-12 wrapper to center the timeline content better between the red lines */}
      <div className="lg:px-12 w-full">
        {/* TimelineComposer only visible on desktop */}
        <div className="hidden lg:block mb-6">
          <TimelineComposer />
        </div>
        <ul className="flex flex-col">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <TimelineItem key={activity.id} activity={activity} />
            ))
          ) : (
            <li className="text-center py-8 text-slate-medium">
              No activities yet
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
