
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
  // All required properties are inherited from StreamActivity
  // Adding optional properties for additional functionality
}

interface TimelineItemProps {
  activity: ExtendedActivity;
}

// Markdown renderer for timeline items
const renderMarkdown = (text: string) => {
  if (!text) return '';
  
  let html = text;
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Underline
  html = html.replace(/__(.*?)__/g, '<u>$1</u>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Bullet lists
  html = html.replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li class="ml-4">.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1">$1</ul>');
  
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li class="ml-4">.*<\/li>)/s, '<ol class="list-decimal list-inside space-y-1">$1</ol>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

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

// Get user name color based on activity type
const getUserNameColor = (type?: string) => {
  switch (type) {
    case 'email':
      return 'text-blue-600';
    case 'call':
      return 'text-green-600';
    case 'task':
      return 'text-orange-600';
    case 'meeting':
      return 'text-purple-600';
    case 'status_update':
      return 'text-teal-600';
    case 'system':
      return 'text-gray-600';
    default:
      return 'text-teal-600';
  }
};

export default function TimelineItem({ activity }: TimelineItemProps) {
  const Icon = getActivityIcon(activity.type);
  const colorClass = getActivityColor(activity.type);
  const userNameColor = getUserNameColor(activity.type);
  
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 w-full">
        <div className="flex flex-col gap-3">
          {/* Activity header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {/* Activity type icon next to the summary */}
                <div className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full",
                  colorClass.replace('text-', 'text-').replace('bg-', 'bg-')
                )}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {activity.summary}
                  {activity.via && <span className="text-gray-500"> (via {activity.via})</span>}
                </div>
              </div>
              {activity.author && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span className="text-gray-500">Update by</span>
                  <span className={cn("font-medium", userNameColor)}>
                    {activity.author}
                  </span>
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
          
          {/* Activity body with markdown rendering */}
          <div 
            className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(activity.body || '') }}
          />
          
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
