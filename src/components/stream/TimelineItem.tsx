import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  ThumbsUp, 
  Mail, 
  Phone, 
  FileText, 
  Calendar,
  CheckCircle2,
  MoreHorizontal,
  Reply,
  Heart,
  Settings,
  Activity,
  Pin,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineActivity } from '@/hooks/use-timeline-activities';
import EmailRenderer from '@/components/timeline/EmailRenderer';
import { TiptapEditor, MarkdownToolbar } from '@/components/markdown';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTimelineViewport } from '@/hooks/useTimelineViewport';


interface TimelineItemProps {
  activity: TimelineActivity;
  activityIcon?: string;
  activityColor?: string;
  activitySummary?: string;
  activityUserName?: string;
  contactName?: string;
  onTogglePin?: (activityId: string, currentState: boolean) => void;
  onEditActivity?: (activityId: string, newContent: string) => void;
  onDeleteActivity?: (activityId: string) => void;
}

// Function to detect if content is already HTML (from TiptapEditor) or markdown
const isHtmlContent = (content: string): boolean => {
  // Check for common HTML tags that TiptapEditor generates
  const htmlTagRegex = /<(h[1-6]|p|div|ul|ol|li|strong|em|code|blockquote|a|br)\b[^>]*>/i;
  return htmlTagRegex.test(content);
};

// Markdown renderer for timeline items - Enhanced version
const renderMarkdown = (text: string) => {
  if (!text) return '';
  
  // If content is already HTML (from TiptapEditor), return it as-is
  if (isHtmlContent(text)) {
    return text;
  }

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
    return `<li class="ml-${Math.min(level * 4, 12)} list-item" style="list-style-type: circle;">${content}</li>`;
  });
  
  // Procesar listas de primer nivel
  html = html.replace(/^[-*+•] (.+)$/gm, '<li class="list-item">$1</li>');
  
  // Envolver listas de bullets consecutivas
  html = html.replace(/(<li class="[^"]*list-item[^"]*"[^>]*>.*?<\/li>(\s*<li class="[^"]*list-item[^"]*"[^>]*>.*?<\/li>)*)/gs, 
    '<ul class="list-disc list-outside my-3 pl-6">$1</ul>');
  
  // Listas numeradas (mejoradas para manejar múltiples líneas y anidación)
  // Procesar listas numeradas anidadas primero
  html = html.replace(/^(\s{2,})(\d+)\. (.+)$/gm, (match, indent, num, content) => {
    const level = Math.floor(indent.length / 2);
    return `<li class="ml-${Math.min(level * 4, 12)} numbered-item" style="list-style-type: lower-alpha;">${content}</li>`;
  });
  
  // Procesar listas numeradas de primer nivel
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="numbered-item">$2</li>');
  
  // Envolver listas numeradas consecutivas
  html = html.replace(/(<li class="[^"]*numbered-item[^"]*"[^>]*>.*?<\/li>(\s*<li class="[^"]*numbered-item[^"]*"[^>]*>.*?<\/li>)*)/gs, 
    '<ol class="list-decimal list-outside my-3 pl-6">$1</ol>');
  
  // Saltos de línea (al final para no interferir con otros elementos)
  // IMPORTANTE: No convertir saltos de línea que están dentro de listas
  // Primero, proteger el contenido de las listas
  const listPlaceholders: string[] = [];
  html = html.replace(/(<[uo]l[^>]*>.*?<\/[uo]l>)/gs, (match) => {
    const placeholder = `__LIST_PLACEHOLDER_${listPlaceholders.length}__`;
    listPlaceholders.push(match);
    return placeholder;
  });
  
  // Ahora convertir saltos de línea solo fuera de las listas
  html = html.replace(/\n/g, '<br>');
  
  // Restaurar las listas
  listPlaceholders.forEach((list, index) => {
    html = html.replace(`__LIST_PLACEHOLDER_${index}__`, list);
  });
  

  
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
  } else if (diffInSeconds < 2592000) { // Less than 30 days
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  } else if (diffInSeconds < 31536000) { // Less than 1 year
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}mo`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years}y`;
  }
};

// Format full timestamp - back to original full date format
const formatFullTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Format absolute timestamp for tooltip
const formatAbsoluteTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

// Helper function to format email recipients display
const formatEmailRecipients = (to?: Array<{name?: string; email: string}>, contactName?: string) => {
  if (!to || to.length === 0) {
    return contactName || 'Contact';
  }
  
  if (to.length === 1) {
    return to[0].name || to[0].email;
  }
  
  // Multiple recipients - show first recipient + count
  const firstRecipient = to[0].name || to[0].email;
  const remainingCount = to.length - 1;
  
  return (
    <span>
      {firstRecipient}
      <span className="text-gray-400 ml-1">
        and {remainingCount} more
      </span>
    </span>
  );
};

const TimelineItem = React.memo(function TimelineItem({ 
  activity, 
  activityIcon, 
  activityColor, 
  activitySummary, 
  activityUserName,
  contactName,
  onTogglePin,
  onEditActivity,
  onDeleteActivity
}: TimelineItemProps) {
  const [optimisticPinState, setOptimisticPinState] = useState(activity.is_pinned);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(activity.content || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editor, setEditor] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Timeline viewport tracking with progressive visibility
  const { elementRef: timelineRef, isViewed, visibilityPercentage, maxVisibilityReached } = useTimelineViewport(activity.id);
  
  // OPTIMIZED: Memoize expensive calculations
  const activityProps = useMemo(() => {
    const Icon = getActivityIcon(activityIcon, activity.type);
    const colorClass = activityColor || getActivityColor(activity.type);
    const userNameColor = getUserNameColor(activity.type);
    const relativeTime = formatRelativeTime(activity.timestamp);
    const fullTimestamp = formatFullTimestamp(activity.timestamp);
    const absoluteTimestamp = formatAbsoluteTimestamp(activity.timestamp);
    
    // Get content to display - for emails, show snippet or subject
    const displayContent = activity.source === 'gmail' && activity.subject 
      ? activity.snippet || activity.subject
      : activity.content;
    
    // Get user name - use the passed prop or default to User
    const userName = activityUserName || 'User';
    
    return {
      Icon,
      colorClass,
      userNameColor,
      relativeTime,
      fullTimestamp,
      absoluteTimestamp,
      displayContent,
      userName
    };
  }, [activity, activityIcon, activityColor, activityUserName]);

  // OPTIMIZED: Memoize permissions
  const permissions = useMemo(() => {
    // Only show edit/delete for internal activities (user-created notes)
    const canEditDelete = activity.source === 'internal' && activity.type === 'note';
    
    // Allow pinning for both internal activities and Gmail emails
    const canPin = activity.source === 'internal' || (activity.source === 'gmail' && activity.type === 'email');
    
    return { canEditDelete, canPin };
  }, [activity.source, activity.type]);
  
  // Update optimistic state when activity changes
  React.useEffect(() => {
    setOptimisticPinState(activity.is_pinned);
  }, [activity.is_pinned]);

  // Update edit content when activity changes
  React.useEffect(() => {
    setEditContent(activity.content || '');
  }, [activity.content]);

  // Memoized height check function
  const checkHeight = useCallback(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const shouldShow = contentHeight > 200;
      
      // Debug logging (only for development)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Height check:', {
          activityId: activity.id,
          subject: activity.subject || 'No subject',
          contentHeight,
          shouldShow
        });
      }
      
      setShowExpandButton(shouldShow);
      return shouldShow;
    }
    return false;
  }, [activity.id, activity.source, activity.subject, activity.bodyHtml, activity.bodyText, activityProps.displayContent, isExpanded]);

  // Check if content needs expand button
  useEffect(() => {
    if (!isExpanded) {
      // Immediate check
      const immediateResult = checkHeight();
      
      // For emails, do additional checks since content loads asynchronously
      if (activity.source === 'gmail' && (activity.bodyHtml || activity.bodyText)) {
        // Multiple checks to catch content loading
        const timers = [
          setTimeout(() => checkHeight(), 100),
          setTimeout(() => checkHeight(), 300),
          setTimeout(() => checkHeight(), 500)
        ];
        
        return () => {
          timers.forEach(timer => clearTimeout(timer));
        };
      }
    }
  }, [activity.id, activity.source, activity.bodyHtml, activity.bodyText, isExpanded, checkHeight]);

  // OPTIMIZED: Memoize click outside handler
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (showDropdown && !(event.target as Element).closest('.dropdown-menu')) {
      setShowDropdown(false);
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // OPTIMIZED: Memoize event handlers
  const handlePinClick = useCallback(() => {
    const newPinState = !optimisticPinState;
    setOptimisticPinState(newPinState);
    onTogglePin?.(activity.id, newPinState);
    setShowDropdown(false);
  }, [optimisticPinState, onTogglePin, activity.id]);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setShowDropdown(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    onEditActivity?.(activity.id, editContent);
    setIsEditing(false);
  }, [onEditActivity, activity.id, editContent]);

  const handleCancelEdit = useCallback(() => {
    setEditContent(activity.content || '');
    setIsEditing(false);
  }, [activity.content]);

  const handleRemoveClick = useCallback(() => {
    setShowDeleteConfirm(true);
    setShowDropdown(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    onDeleteActivity?.(activity.id);
    setShowDeleteConfirm(false);
  }, [onDeleteActivity, activity.id]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Handle formatting commands for the editor
  const handleFormat = useCallback((format: string) => {
    if (!editor) return;

    switch (format) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strikethrough':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
      case 'heading1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'numberedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'quote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'divider':
        editor.chain().focus().setHorizontalRule().run();
        break;
    }
  }, [editor]);

  const handleLinkRequest = useCallback((url: string, linkText: string) => {
    if (!editor) return;

    if (url && linkText) {
      editor.chain().focus().setLink({ href: url }).insertContent(linkText).run();
    }
  }, [editor]);

  const handleCodeBlockRequest = useCallback((selectedText: string, range: Range) => {
    if (!editor) return;

    const selection = window.getSelection();
    if (selection && range) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      const codeBlock = `\`\`\`\n${selectedText}\n\`\`\``;
      editor.chain().focus().insertContent(codeBlock).run();
    }
  }, [editor]);

  return (
    <li ref={timelineRef} className="relative pl-12 pb-8 mb-[50px]">
      {/* Timeline line - progressive filling effect */}
      <div 
        className="absolute left-[22px] top-[20px] bottom-[-200px] w-[1px] transition-all duration-300 ease-out"
        style={{
          background: visibilityPercentage > 0 
            ? `linear-gradient(to bottom, 
                #14b8a6 0%, 
                #14b8a6 ${visibilityPercentage}%, 
                #e5e7eb ${visibilityPercentage}%, 
                #e5e7eb 100%)`
            : '#e5e7eb'
        }}
      ></div>
      
      {/* Timestamp on the left side of timeline */}
      
      
      {/* Timeline dot with activity icon */}
      <div className={cn("absolute left-[5px] top-[8px] w-8 h-8 rounded-full flex items-center justify-center z-10", activityProps.colorClass)}>
        <activityProps.Icon className="h-5 w-5" />
      </div>
      
      {/* Tooltip for timestamp */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="absolute top-[15px] left-[-40px] text-xs text-gray-500 font-medium text-right cursor-help hover:text-gray-700 transition-colors"
            style={{
              right: 'calc(100% - 0px)', // Position relative to the timeline dot
              minWidth: activityProps.relativeTime.length <= 2 ? '24px' : activityProps.relativeTime.length <= 4 ? '32px' : '48px'
            }}
          >
            {activityProps.relativeTime}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-none">
          <p>{activityProps.absoluteTimestamp}</p>
        </TooltipContent>
      </Tooltip>
      
      {/* Activity card with white background */}
      <div className={cn(
        "relative bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md w-[calc(100%-20px)]",
        "transition-all duration-500 ease-out",
        isExpanded && "shadow-md"
      )}>
        {/* Dropdown menu */}
        <div className="absolute top-2 right-2">
          {(permissions.canEditDelete || permissions.canPin) && (
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors dropdown-menu"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          )}
          
          {showDropdown && (permissions.canEditDelete || permissions.canPin) && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[120px] dropdown-menu">
              {permissions.canPin && (
                <button
                  onClick={handlePinClick}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Pin className="w-4 h-4" />
                  <span>{optimisticPinState ? 'Unpin' : 'Pin'}</span>
                </button>
              )}
              
              {permissions.canEditDelete && (
                <>
                  <button
                    onClick={handleEditClick}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={handleRemoveClick}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

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
          <span className={cn("ml-7 font-medium", activityProps.userNameColor)}>
            {activityProps.userName}
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
            {activity.type === 'email' 
              ? formatEmailRecipients(activity.to, contactName)
              : contactName || 'Contact'}
          </span>
        </div>
        
        {/* Additional email details for multiple recipients */}
        {activity.type === 'email' && activity.to && activity.to.length > 1 && (
          <div className="text-xs text-gray-500 mb-2 pl-7">
            <span className="font-medium">To:</span> {activity.to.map(recipient => recipient.name || recipient.email).join(', ')}
            {activity.cc && activity.cc.length > 0 && (
              <div className="mt-1">
                <span className="font-medium">CC:</span> {activity.cc.map(recipient => recipient.name || recipient.email).join(', ')}
              </div>
            )}
          </div>
        )}
        

        
        {/* Activity content */}
        {activityProps.displayContent && (
          <div className="mb-3 pl-7">
            {isEditing ? (
              /* Edit mode */
              <div className="space-y-3">
                <TiptapEditor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Edit your note..."
                  minHeight="100px"
                  showToolbar={false}
                  externalToolbar={true}
                  isCompact={false}
                  autoFocus={true}
                  onEditorReady={(editor) => setEditor(editor)}
                />
                {/* Responsive layout: Toolbar + Action Buttons */}
                <div className="border-t border-gray-100 pt-3">
                  {/* Toolbar */}
                  <div className="mb-3">
                    <MarkdownToolbar
                      editor={editor}
                      onFormat={handleFormat}
                      onLinkRequest={handleLinkRequest}
                      onCodeBlockRequest={handleCodeBlockRequest}
                      isCompact={false}
                      className="p-0"
                    />
                  </div>
                  
                  {/* Action Buttons - Always on their own line */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Display mode with expandable content */
              <div className="relative">
                <div 
                  ref={contentRef}
                  className={cn(
                    "overflow-hidden transition-all duration-500 ease-out",
                    !isExpanded && "max-h-[200px]",
                    isExpanded && "max-h-[2000px]"
                  )}
                  style={{
                    transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {activity.source === 'gmail' && activity.type === 'email' ? (
                    <EmailRenderer
                      bodyHtml={activity.bodyHtml}
                      bodyText={activity.bodyText}
                      subject={activity.subject}
                      emailId={activity.id}
                      attachments={activity.attachments}
                    />
                  ) : (
                    <div 
                      className="text-sm text-gray-800 leading-relaxed timeline-content"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(activityProps.displayContent) }}
                    />
                  )}
                </div>
                
                {/* Fade overlay when collapsed */}
                {!isExpanded && showExpandButton && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none transition-opacity duration-300"
                  />
                )}
                

              </div>
            )}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center justify-between text-xs text-gray-500 pl-7">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 hover:text-teal-600 transition-colors">
              <Reply className="h-3 w-3" />
              <span>2</span>
            </button>
            <button className="flex items-center gap-1 hover:text-teal-600 transition-colors">
              <Heart className="h-3 w-3" />
              <span>5</span>
            </button>
          </div>
          
          {/* Show more/less button */}
          {(activityProps.displayContent || activity.bodyHtml || activity.bodyText) && (
            <div className="min-w-[80px]">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-all duration-300 ease-in-out hover:scale-105"
              >
                <span className="transition-all duration-300">
                  {!isExpanded && showExpandButton ? 'Show more' : isExpanded ? 'Show less' : null}
                </span>
                <div className="transition-transform duration-300 ease-in-out">
                  {!isExpanded && showExpandButton && <ChevronDown className="w-3 h-3" />}
                  {isExpanded && <ChevronUp className="w-3 h-3" />}
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Activity
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this activity? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Timeline content styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes expandCard {
            from {
              max-height: 200px;
              opacity: 0.95;
            }
            to {
              max-height: 2000px;
              opacity: 1;
            }
          }
          
          @keyframes collapseCard {
            from {
              max-height: 2000px;
              opacity: 1;
            }
            to {
              max-height: 200px;
              opacity: 0.95;
            }
          }
          
          .timeline-content h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 16px;
            margin-bottom: 8px;
            color: #111827;
          }
          .timeline-content h2 {
            font-size: 1.25rem;
            font-weight: 700;
            margin-top: 12px;
            margin-bottom: 8px;
            color: #111827;
          }
          .timeline-content h3 {
            font-size: 1.125rem;
            font-weight: 700;
            margin-top: 12px;
            margin-bottom: 8px;
            color: #111827;
          }
          .timeline-content ul {
            list-style-type: disc;
            list-style-position: outside;
            margin: 12px 0;
            padding-left: 24px;
          }
          .timeline-content ol {
            list-style-type: decimal;
            list-style-position: outside;
            margin: 12px 0;
            padding-left: 24px;
          }
          .timeline-content li {
            margin-bottom: 4px;
            line-height: 1.5;
          }
          .timeline-content blockquote {
            margin: 12px 0;
            padding: 8px 16px;
          }
          .timeline-content pre {
            margin: 12px 0;
            padding: 16px;
          }
          .timeline-content code {
            padding: 2px 6px;
          }
          .timeline-content hr {
            margin: 16px 0;
          }
        `
      }} />
    </li>
  );
});

export default TimelineItem;
