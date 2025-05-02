
import React from 'react';
import TimelineItem from './TimelineItem';
import { sampleActivities } from './sample-activities';

const TIMELINE_COL_WIDTH = 60;

export default function StreamTimeline() {
  return (
    <div className="bg-slate-light/10 p-6 rounded-md">
      <ul className="flex flex-col">
        {sampleActivities.map((activity) => (
          <TimelineItem key={activity.id} activity={activity} />
        ))}
      </ul>
    </div>
  );
}
