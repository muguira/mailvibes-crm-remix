
import React from 'react';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { StreamActivity } from './sample-activities';

const TIMELINE_DOT_SIZE = 6; // px

interface TimelineItemProps {
  activity: StreamActivity;
}

export default function TimelineItem({ activity }: TimelineItemProps) {
  return (
    <li className="relative pb-6"> 
      {/* Timeline dot */}
      <div className="absolute left-[28px] top-2 h-[6px] w-[6px] rounded-full bg-teal-primary -translate-x-1/2"></div>
      
      {/* Timestamp marker - aligned with translate */}
      <div className="absolute -left-[56px] top-2 w-[56px] text-xs text-slate-medium font-medium text-right translate-x-1/2 -translate-y-[2px]">
        {activity.relativeTime}
      </div>
      
      {/* Activity card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-light/30 p-4 w-full">
        <div className="flex flex-col gap-2">
          {/* Activity header */}
          <div className="text-sm text-teal-primary font-medium">
            {activity.summary}
            {activity.via && <span className="text-slate-medium"> (via {activity.via})</span>}
          </div>
          
          {/* Activity body */}
          <div className="text-sm text-slate-dark">
            {activity.body}
          </div>
          
          {/* Action row */}
          <div className="flex items-center gap-3 pt-2 mt-1 border-t border-slate-light/20">
            <button className="flex items-center gap-1 text-xs text-slate-medium hover:text-teal-primary">
              <MessageCircle className="h-3 w-3" />
              Reply
            </button>
            <button className="flex items-center gap-1 text-xs text-slate-medium hover:text-teal-primary">
              <ThumbsUp className="h-3 w-3" />
              Like
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
