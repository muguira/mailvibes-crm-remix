
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
  Heart,
  Settings,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineActivity } from '@/hooks/use-timeline-activities';
import EmailRenderer from '@/components/timeline/EmailRenderer';

interface TimelineItemProps {
  activity: TimelineActivity;
  activityIcon?: string;
  activityColor?: string;
  activitySummary?: string;
  activityUserName?: string;
  contactName?: string;
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

const getActivityIcon = (iconName?: string) => {
  switch (iconName) {
    case 'Mail':
      return Mail;
    case 'Phone':
      return Phone;
    case 'FileText':
      return FileText;
    case 'Calendar':
      return Calendar;
    case 'CheckSquare':
      return CheckCircle2;
    case 'Settings':
      return Settings;
    case 'Activity':
      return Activity;
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
    case 'note':
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
    case 'note':
      return 'text-teal-600';
    case 'system':
      return 'text-gray-600';
    default:
      return 'text-teal-600';
  }
};

// Format timestamp to relative time
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - activityTime.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  } else {
    return activityTime.toLocaleDateString();
  }
};

// Format full timestamp
const formatFullTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export default function TimelineItem({ 
  activity, 
  activityIcon, 
  activityColor, 
  activitySummary, 
  activityUserName,
  contactName 
}: TimelineItemProps) {
  const Icon = getActivityIcon(activityIcon);
  const colorClass = activityColor || getActivityColor(activity.type);
  const userNameColor = getUserNameColor(activity.type);
  const relativeTime = formatRelativeTime(activity.timestamp);
  const fullTimestamp = formatFullTimestamp(activity.timestamp);
  
  // Get content to display - for emails, show snippet or subject
  const displayContent = activity.source === 'gmail' && activity.subject 
    ? activity.snippet || activity.subject
    : activity.content;
  
  // Get user name - use the passed prop or default to User
  const userName = activityUserName || 'User';
  
  return (
    <li className="relative pl-10 pb-6 last:overflow-hidden last:pb-0">
      {/* Timeline line - more prominent and continuous */}
      <div className="absolute left-[25px] top-[10px] bottom-[-20px] w-[1px] bg-gray-300"></div>
      
      {/* Timestamp on the left side of timeline */}
      <div className="absolute left-[-15px] top-[5px] w-8 text-xs text-gray-500 font-light text-right">
        {relativeTime}
      </div>
      
      {/* Timeline dot - simple visible point */}
      <div className="absolute left-[21px] top-[10px] w-2 h-2 rounded-full bg-gray-600 z-10"></div>
      
      {/* Activity card with white background */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 pr-[7px]">
        {/* Header with user info */}
        <div className="flex items-center text-sm mb-1">
          {/* Activity type icon */}
          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center mr-2", colorClass)}>
            <Icon className="h-3 w-3" />
          </div>
          
          <span className={cn("font-medium", userNameColor)}>
            {userName}
          </span>
          <span className="text-gray-500 ml-1">
            {activity.type === 'email' ? 'emailed' : 
             activity.type === 'note' ? 'added a note to' :
             activity.type === 'call' ? 'called' :
             activity.type === 'meeting' ? 'met with' :
             activity.type === 'task' ? 'created a task for' :
             `added a ${activity.type} to`}
          </span>
                     <span className="text-gray-700 font-medium ml-1">
             {activity.type === 'email' && activity.to && activity.to.length > 0 
               ? activity.to[0].name || activity.to[0].email
               : contactName || 'Contact'}
           </span>
        </div>
        
        {/* Timestamp details */}
        <div className="text-xs text-gray-400 mb-3">
          {fullTimestamp}
        </div>
        
        {/* Activity content */}
        {displayContent && (
          <div className="mb-3">
            {activity.source === 'gmail' && activity.type === 'email' ? (
              <EmailRenderer
                bodyHtml={activity.bodyHtml}
                bodyText={activity.bodyText}
                subject={activity.subject}
              />
            ) : (
              <div 
                className="text-sm text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
              />
            )}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <button className="flex items-center gap-1 hover:text-teal-600 transition-colors">
            <Reply className="h-3 w-3" />
            <span>2</span>
          </button>
          <button className="flex items-center gap-1 hover:text-teal-600 transition-colors">
            <Heart className="h-3 w-3" />
            <span>5</span>
          </button>
          <button className="flex items-center gap-1 hover:text-teal-600 transition-colors">
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </div>
      </div>
    </li>
  );
}
