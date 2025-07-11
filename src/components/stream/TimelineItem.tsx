
import React, { useState } from 'react';
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
  Activity,
  Pin
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
  onTogglePin?: (activityId: string, currentState: boolean) => void;
}

// Markdown renderer for timeline items - Enhanced version
const renderMarkdown = (text: string) => {
  if (!text) return '';
  

  
  let html = text;
  
  // Encabezados (H1-H6) - deben procesarse antes que otros elementos
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-2 mt-4 text-gray-900">$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-2 mt-3 text-gray-900">$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-2 mt-3 text-gray-900">$1</h3>');
  html = html.replace(/^#### (.*$)/gm, '<h4 class="text-base font-bold mb-1 mt-2 text-gray-900">$1</h4>');
  html = html.replace(/^##### (.*$)/gm, '<h5 class="text-sm font-bold mb-1 mt-2 text-gray-900">$1</h5>');
  html = html.replace(/^###### (.*$)/gm, '<h6 class="text-xs font-bold mb-1 mt-2 text-gray-900">$1</h6>');
  
  // Código en bloque (con lenguaje opcional)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang ? `<span class="text-xs text-gray-500 mb-1 block">${lang}</span>` : '';
    return `<div class="bg-gray-50 border border-gray-200 rounded-md p-3 my-3 overflow-x-auto">
      ${language}
      <pre><code class="text-sm font-mono text-gray-800 whitespace-pre-wrap">${code.trim()}</code></pre>
    </div>`;
  });
  
  // Código inline
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 border">$1</code>');
  
  // Strikethrough
  html = html.replace(/~~(.*?)~~/g, '<del class="line-through text-gray-500">$1</del>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>');
  
  // Underline
  html = html.replace(/__(.*?)__/g, '<u class="underline decoration-2 underline-offset-2">$1</u>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-teal-600 underline hover:text-teal-800 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Líneas horizontales
  html = html.replace(/^---$/gm, '<hr class="border-t border-gray-300 my-4">');
  
  // Blockquotes (procesado antes de los saltos de línea)
  // Maneja tanto líneas individuales como múltiples líneas de blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-teal-400 pl-4 italic text-gray-600 my-2 bg-gray-50 py-2 rounded-r">$1</blockquote>');
  
  // Combina blockquotes consecutivos en un solo elemento
  html = html.replace(/(<blockquote[^>]*>.*?<\/blockquote>)(\s*<blockquote[^>]*>.*?<\/blockquote>)*/gs, (match) => {
    const quotes = match.match(/<blockquote[^>]*>(.*?)<\/blockquote>/gs);
    if (quotes && quotes.length > 1) {
      const content = quotes.map(quote => quote.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/s, '$1')).join('<br>');
      return `<blockquote class="border-l-4 border-teal-400 pl-4 italic text-gray-600 my-2 bg-gray-50 py-2 rounded-r">${content}</blockquote>`;
    }
    return match;
  });
  

  
  // Listas con bullets (mejoradas para manejar múltiples líneas y anidación)
  // Procesar listas anidadas primero (con más espacios)
  html = html.replace(/^(\s{2,})[-*+•] (.+)$/gm, (match, indent, content) => {
    const level = Math.floor(indent.length / 2);
    return `<li class="ml-${Math.min(level * 4, 12)} mb-1 list-item" style="list-style-type: circle;">${content}</li>`;
  });
  
  // Procesar listas de primer nivel
  html = html.replace(/^[-*+•] (.+)$/gm, '<li class="mb-1 list-item">$1</li>');
  
  // Envolver listas de bullets consecutivas
  html = html.replace(/(<li class="[^"]*mb-1[^"]*list-item[^"]*"[^>]*>.*?<\/li>(\s*<li class="[^"]*mb-1[^"]*list-item[^"]*"[^>]*>.*?<\/li>)*)/gs, 
    '<ul class="list-disc list-outside space-y-1 my-3 pl-6">$1</ul>');
  
  // Listas numeradas (mejoradas para manejar múltiples líneas y anidación)
  // Procesar listas numeradas anidadas primero
  html = html.replace(/^(\s{2,})(\d+)\. (.+)$/gm, (match, indent, num, content) => {
    const level = Math.floor(indent.length / 2);
    return `<li class="ml-${Math.min(level * 4, 12)} mb-1 numbered-item" style="list-style-type: lower-alpha;">${content}</li>`;
  });
  
  // Procesar listas numeradas de primer nivel
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="mb-1 numbered-item">$2</li>');
  
  // Envolver listas numeradas consecutivas
  html = html.replace(/(<li class="[^"]*mb-1[^"]*numbered-item[^"]*"[^>]*>.*?<\/li>(\s*<li class="[^"]*mb-1[^"]*numbered-item[^"]*"[^>]*>.*?<\/li>)*)/gs, 
    '<ol class="list-decimal list-outside space-y-1 my-3 pl-6">$1</ol>');
  
  // Saltos de línea (al final para no interferir con otros elementos)
  html = html.replace(/\n/g, '<br>');
  

  
  return html;
};

const getActivityIcon = (iconName?: string, activityType?: string) => {
  // First check if we have a specific icon name
  if (iconName) {
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
  }
  
  // If no specific icon, use activity type
  switch (activityType) {
    case 'email':
      return Mail;
    case 'call':
      return Phone;
    case 'meeting':
      return Calendar;
    case 'task':
      return CheckCircle2;
    case 'note':
      return MessageCircle;
    case 'system':
      return Settings;
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
  contactName,
  onTogglePin 
}: TimelineItemProps) {
  const [optimisticPinState, setOptimisticPinState] = useState(activity.is_pinned);
  
  const Icon = getActivityIcon(activityIcon, activity.type);
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
  
  // Update optimistic state when activity changes
  React.useEffect(() => {
    setOptimisticPinState(activity.is_pinned);
  }, [activity.is_pinned]);
  
  return (
    <li className="relative pl-12 pb-8  last:pb-0">
      {/* Timeline line - more prominent and continuous */}
      <div className="absolute left-[22px] top-[20px] bottom-[-20px] w-[1px] bg-gray-200"></div>
      
      {/* Timestamp on the left side of timeline */}
      <div className="absolute left-[-30px] top-[15px] w-8 text-xs text-gray-500 font-medium text-right">
        {relativeTime}
      </div>
      
      {/* Timeline dot with activity icon */}
      <div className={cn("absolute left-[5px] top-[8px] w-8 h-8 rounded-full flex items-center justify-center z-10", colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      
      {/* Activity card with white background */}
      <div className={`bg-white rounded-lg border shadow-sm p-4 mb-5 pr-[7px] relative ${
        optimisticPinState 
          ? 'border-amber-200 bg-amber-50/30' 
          : 'border-gray-200'
      }`}>
        {/* Pin button - top right corner */}
        {onTogglePin && activity.source === 'internal' && (
          <button
            onClick={() => {
              // Update optimistic state immediately for instant feedback
              setOptimisticPinState(!optimisticPinState);
              onTogglePin(activity.id, !optimisticPinState);
            }}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 hover:scale-110 ${
              optimisticPinState
                ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            title={optimisticPinState ? 'Unpin activity' : 'Pin activity'}
          >
            <Pin className={`w-3.5 h-3.5 transition-transform ${
              optimisticPinState ? 'rotate-45' : ''
            }`} />
          </button>
        )}

        {/* Pinned indicator badge */}
        {optimisticPinState && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
            <Pin className="w-3 h-3" />
            <span>Pinned</span>
          </div>
        )}

        {/* Header with user info */}
        <div className={`flex items-center text-sm mb-2 ${
          optimisticPinState ? 'mt-6' : ''
        }`}>
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
        <div className="text-xs text-gray-400 mb-3 pl-7">
          {fullTimestamp}
        </div>
        
        {/* Activity content */}
        {displayContent && (
          <div className="mb-3 pl-7">
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
        <div className="flex items-center gap-4 text-xs text-gray-500 pl-7">
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
