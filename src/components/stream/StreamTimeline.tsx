
import React from 'react';
import TimelineItem from './TimelineItem';
import TimelineComposer from './TimelineComposer';
import { sampleActivities } from './sample-activities';

const TIMELINE_COL_WIDTH = 60;

export default function StreamTimeline() {
  return (
    <div className="bg-slate-light/10 p-6 rounded-md">
      {/* Added lg:px-12 wrapper to center the timeline content better between the red lines */}
      <div className="lg:px-12 w-full">
        {/* TimelineComposer only visible on desktop */}
        <div className="hidden lg:block mb-6">
          <TimelineComposer />
        </div>
        <ul className="flex flex-col">
          {sampleActivities.map((activity) => (
            <TimelineItem key={activity.id} activity={activity} />
          ))}
        </ul>
      </div>
    </div>
  );
}
