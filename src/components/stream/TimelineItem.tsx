
import React from 'react';
import { 
  MessageCircle, 
  ThumbsUp, 
  Mail, 
  Phone, 
  FileText, 
  Calendar,
  User,
  Bell,
  CheckCircle2,
  MoreHorizontal,
  Reply,
  Heart
} from 'lucide-react';
import { StreamActivity } from './sample-activities';
import { cn } from '@/lib/utils';

interface ExtendedActivity extends StreamActivity {
  type?: 'email' | 'call' | 'note' | 'task' | 'meeting' | 'status_update' | 'system';
  author?: string;
  timestamp?: string;
  reactions?: { type: string; count: number }[];
}

interface TimelineItemProps {
  activity: ExtendedActivity;
}

const getActivityIcon = (type?: string) => {
  switch (type) {
    case 'email':
      return Mail;
    case 'call':
      return Phone;
    case 'task':
      return FileText;
    case 'meeting':
      return Calendar;
    case 'status_update':
      return CheckCircle2;
    case 'system':
      return Bell;
    default:
      return MessageCircle;
  }
};

const getActivityColor = (type?: string) => {
  switch (type) {
    case 'email':
      return 'text-blue-600 bg-blue-50';
    case 'call':
      return 'text-green-600 bg-green-50';
    case 'task':
      return 'text-orange-600 bg-orange-50';
    case 'meeting':
      return 'text-purple-600 bg-purple-50';
    case 'status_update':
      return 'text-teal-600 bg-teal-50';
    case 'system':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-teal-600 bg-teal-50';
  }
};

export default function TimelineItem({ activity }: TimelineItemProps) {
  const Icon = getActivityIcon(activity.type);
  const colorClass = getActivityColor(activity.type);
  
  return (
    <li className="relative pl-[90px] pb-6"> {/* Increased padding to prevent overlap */}
      {/* Timeline icon and line */}
      <div className={cn(
        "absolute left-[38px] top-2 h-8 w-8 rounded-full flex items-center justify-center",
        colorClass
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="absolute left-[53px] -bottom-3 top-10 border-l-2 border-dashed border-gray-200"></div>
      
      {/* Timestamp marker - moved further left */}
      <div className="absolute left-0 top-3 w-[30px] text-xs text-gray-500 font-medium text-right">
        {activity.relativeTime}
      </div>
      
      {/* Activity card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 max-w-lg">
        <div className="flex flex-col gap-3">
          {/* Activity header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {activity.summary}
                {activity.via && <span className="text-gray-500"> (via {activity.via})</span>}
              </div>
              {activity.author && (
                <div className="text-xs text-gray-500 mt-1">
                  Update by {activity.author}
                </div>
              )}
              {activity.timestamp && (
                <div className="text-xs text-gray-400 mt-1">
                  {activity.timestamp}
                </div>
              )}
            </div>
            {activity.type === 'email' && (
              <Bell className="h-4 w-4 text-gray-400" />
            )}
          </div>
          
          {/* Activity body */}
          <div className="text-sm text-gray-700 leading-relaxed">
            {activity.body}
          </div>
          
          {/* Reactions */}
          {activity.reactions && activity.reactions.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              {activity.reactions.map((reaction, index) => (
                <div key={index} className="flex items-center gap-1 text-xs text-gray-500">
                  <span>{reaction.type}</span>
                  <span>{reaction.count}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Action row */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 transition-colors">
              <Reply className="h-3 w-3" />
              <span>2</span>
            </button>
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 transition-colors">
              <Heart className="h-3 w-3" />
              <span>5</span>
            </button>
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-600 transition-colors">
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
