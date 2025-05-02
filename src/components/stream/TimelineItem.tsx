import React from 'react';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { StreamActivity } from './sample-activities';

const TIMELINE_DOT_SIZE = 6; // px

interface TimelineItemProps {
  activity: StreamActivity;
}

export default function TimelineItem({ activity }: TimelineItemProps) {
  return (
    <React.Fragment>
      {/* Desktop version - simplified since parent grid handles alignment */}
      <div className="hidden lg:block w-full">
        {/* The card doesn't need positioning since it's in the second grid column */}
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
      </div>
      
      {/* Mobile version (unchanged) */}
      <li className="relative pl-[76px] pb-6 lg:hidden"> {/* 60px column + 16px gap */}
        {/* Timeline dot and line */}
        <div className="absolute left-[27px] top-2 h-[6px] w-[6px] rounded-full bg-teal-primary"></div>
        <div className="absolute left-[29px] -bottom-3 top-5 border-l-2 border-dashed border-teal-light/40"></div>
        
        {/* Timestamp marker - right-aligned within the 60px column and nudged 2px upward */}
        <div className="absolute left-0 top-2 w-[19px] text-xs text-slate-medium font-medium text-right -translate-y-[2px]">
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
    </React.Fragment>
  );
}
