
import React from 'react';
import TimelineItem from './TimelineItem';
import { sampleActivities } from './sample-activities';

const TIMELINE_COL_WIDTH = 60;

export default function StreamTimeline() {
  return (
    <div className="bg-slate-light/10 rounded-md w-full">
      <div className="relative pl-[56px] pr-0 space-y-6">
        {/* Timeline vertical axis line */}
        <div className="absolute left-[28px] inset-y-0 w-px border-l-2 border-dashed border-teal-light/40"></div>
        
        <ul className="flex flex-col w-full">
          {sampleActivities.map((activity) => (
            <TimelineItem key={activity.id} activity={activity} />
          ))}
        </ul>
      </div>
    </div>
  );
}
