
import React from 'react';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { StreamActivity } from './sample-activities';

interface TimelineItemProps {
  activity: StreamActivity;
}

export default function TimelineItem({ activity }: TimelineItemProps) {
  return (
    <li className="relative pl-8 pb-6">
      {/* Timeline dot and line */}
      <div className="absolute left-2 top-2 h-3 w-3 rounded-full bg-teal-primary"></div>
      <div className="absolute left-3 -bottom-3 top-5 border-l-2 border-dashed border-slate-light/40"></div>
      
      {/* Timestamp marker */}
      <div className="absolute left-0 top-2 text-xs text-slate-medium font-medium">
        {activity.relativeTime}
      </div>
      
      {/* Activity card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-light/30 p-4 max-w-md">
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
