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
import { useIsMobile } from '@/hooks/use-mobile';
import { useGmailStore } from '@/stores/gmail/gmailStore';
import { toast } from '@/hooks/use-toast';
import { GmailEmail } from '@/services/google/gmailApi';
import { useContactEmails } from '@/hooks/use-contact-emails-v2';
import { logger } from '@/utils/logger';


interface TimelineItemProps {
  activity: TimelineActivity;
  activityIcon?: string;
  activityColor?: string;
  activitySummary?: string;
  activityUserName?: string;
  contactName?: string;
  isLast?: boolean; // New prop to identify the last timeline item
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
    case 'email_sent':
      return Mail;
    case 'email_thread':
      return Mail; // ✅ NEW: Use Mail icon for email threads
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
    case 'email_sent':
      return 'text-blue-600 bg-blue-50';
    case 'email_thread':
      return 'text-blue-600 bg-blue-50'; // ✅ NEW: Use blue for email threads
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
    case 'email_sent':
      return 'text-blue-600';
    case 'email_thread':
      return 'text-blue-600'; // ✅ NEW: Use blue for email threads
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

// Helper function to format email recipients display with intelligent name extraction
const formatEmailRecipients = (to?: Array<{name?: string; email: string}>, contactName?: string) => {
  if (!to || to.length === 0) {
    return contactName || 'Contact';
  }
  
  // Helper to get display name from recipient
  const getDisplayName = (recipient: {name?: string; email: string}) => {
    if (recipient.name && recipient.name.trim()) {
      return recipient.name;
    }
    
    // If no name, try to extract a readable name from email
    const emailPart = recipient.email.split('@')[0];
    const cleanName = emailPart
      .replace(/[._-]/g, ' ') // Replace dots, underscores, hyphens with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return cleanName || recipient.email;
  };
  
  if (to.length === 1) {
    const displayName = getDisplayName(to[0]);
    // Prefer contactName if available and looks more complete
    return (contactName && contactName.includes(' ')) ? contactName : displayName;
  }
  
  // Multiple recipients - show first recipient + count
  const firstRecipient = getDisplayName(to[0]);
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
  isLast,
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

  // ✅ NEW: Reply functionality states
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyEditor, setReplyEditor] = useState<any>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // ✅ NEW: Email threading states
  const [isThreadExpanded, setIsThreadExpanded] = useState(activity.isThreadExpanded || false);
  
  // Check if this is an email thread
  const isEmailThread = activity.type === 'email_thread';
  const emailsInThread = activity.emailsInThread || [];
  const threadEmailCount = activity.threadEmailCount || 0;
  
  // State to track if this item has ever been seen
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  
  // Mobile detection for responsive toolbar
  const isMobile = useIsMobile();
  
  // ✅ NEW: Gmail store and contacts hooks for reply functionality
  const gmailStore = useGmailStore();
  const { addOptimisticEmail } = useContactEmails({
    contactEmail: activity.from?.email,
    autoFetch: false, // Don't auto-fetch, just use for optimistic updates
  });
  
  // Timeline viewport tracking with progressive visibility
  const { elementRef: timelineRef, isViewed, visibilityPercentage, maxVisibilityReached } = useTimelineViewport(activity.id);
  
  // State to trigger recalculation on scroll
  const [scrollTrigger, setScrollTrigger] = useState(0);
  
  // Listen for scroll events to update the center-based calculation
  useEffect(() => {
    const handleScroll = () => {
      setScrollTrigger(prev => prev + 1);
    };
    
    // Find the scrollable container (timeline container)
    const scrollContainer = timelineRef.current?.closest('[class*="overflow-y-auto"]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // State to track maximum progress achieved for this item
  const [maxProgress, setMaxProgress] = useState(0);

  // Mark item as viewed when it becomes significantly visible
  useEffect(() => {
    if (visibilityPercentage >= 25 && !hasBeenViewed) {
      setHasBeenViewed(true);
    }
  }, [visibilityPercentage, hasBeenViewed]);

  // Create a sequential filling effect with persistent progress
  const progressiveFillPercentage = useMemo(() => {
    // If item has never been viewed, return 0 (no fill)
    if (!hasBeenViewed) return 0;
    
    if (!timelineRef.current) return maxProgress;
    
    // Get element position
    const element = timelineRef.current;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // If not significantly visible, return the stored max progress
    if (visibilityPercentage < 25) {
      return maxProgress;
    }
    
    // Calculate element's vertical position relative to viewport top
    const elementTop = rect.top;
    
    // Aggressive sequential logic: complete previous items well before starting new ones
    const completeThreshold = viewportHeight * 0.7; // Top 70% - complete before this point
    const startThreshold = viewportHeight * 0.9; // Top 90% - only start filling after this
    
    let currentFillPercentage = 0;
    
    // If element is in the top 70% of viewport, it should be 100% filled
    if (elementTop < completeThreshold) {
      currentFillPercentage = 100;
    }
    // If element is between 70% and 90% of viewport, no filling (gap to ensure completion)
    else if (elementTop >= completeThreshold && elementTop < startThreshold) {
      currentFillPercentage = 0;
    }
    // If element is in the bottom 10% of viewport and visible, start progressive fill
    else if (elementTop >= startThreshold && elementTop <= viewportHeight && visibilityPercentage >= 25) {
      // Progressive fill from 0% to 100% in the small bottom zone
      const distanceFromStart = elementTop - startThreshold;
      const fillZoneHeight = viewportHeight - startThreshold;
      const progressInFillZone = distanceFromStart / fillZoneHeight;
      
      currentFillPercentage = Math.max(0, 100 - (progressInFillZone * 100));
    } else {
      // Element is below viewport or not visible enough - no fill
      currentFillPercentage = 0;
    }
    
    // Apply visibility factor for smooth transitions
    const visibilityFactor = Math.min(1, (visibilityPercentage - 25) / 25); // Ramp up from 25% to 50% visibility
    const calculatedProgress = Math.round(currentFillPercentage * visibilityFactor);
    
    // Return the maximum between current calculation and stored max
    const finalProgress = Math.max(calculatedProgress, maxProgress);
    
    // Update max progress if we've achieved a higher value
    if (finalProgress > maxProgress) {
      setMaxProgress(finalProgress);
    }
    
    return finalProgress;
  }, [visibilityPercentage, timelineRef, scrollTrigger, hasBeenViewed, maxProgress]);
  
  // OPTIMIZED: Memoize expensive calculations
  const activityProps = useMemo(() => {
    const Icon = getActivityIcon(activityIcon, activity.type);
    const colorClass = activityColor || getActivityColor(activity.type);
    const userNameColor = getUserNameColor(activity.type);
    const relativeTime = formatRelativeTime(activity.timestamp);
    const fullTimestamp = formatFullTimestamp(activity.timestamp);
    const absoluteTimestamp = formatAbsoluteTimestamp(activity.timestamp);
    
    // Get content to display - for email threads, show latest email content
    let displayContent;
    if (isEmailThread && activity.latestEmail) {
      displayContent = activity.latestEmail.snippet || activity.latestEmail.subject;
    } else if (activity.source === 'gmail' && activity.subject) {
      displayContent = activity.snippet || activity.subject;
    } else {
      displayContent = activity.content;
    }
    
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
  }, [activity, activityIcon, activityColor, activityUserName, isEmailThread]);

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

  // OPTIMIZED: Memoize event handlers with thread support
  const handlePinClick = useCallback(() => {
    const newPinState = !optimisticPinState;
    setOptimisticPinState(newPinState);
    
    if (isEmailThread && emailsInThread.length > 0) {
      // ✅ NEW: Pin/unpin all emails in the thread
      emailsInThread.forEach(email => {
        onTogglePin?.(email.id, newPinState);
      });
      
      logger.log("✨ Thread pin action:", {
        threadId: activity.threadId,
        emailCount: emailsInThread.length,
        newPinState,
        emailIds: emailsInThread.map(e => e.id)
      });
    } else {
      // Regular single activity pin
      onTogglePin?.(activity.id, newPinState);
    }
    
    setShowDropdown(false);
  }, [optimisticPinState, onTogglePin, activity.id, isEmailThread, emailsInThread, activity.threadId]);

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

  // ✅ NEW: Handle reply email sending
  const handleSendReply = useCallback(async () => {
    // Get the correct email data for threading
    const targetEmail = isEmailThread ? activity.latestEmail : activity;
    const fromEmail = targetEmail?.from?.email;
    
    if (!replyContent.trim() || !fromEmail) {
      toast({
        title: "Error",
        description: "Please enter reply content",
        variant: "destructive",
      });
      return;
    }

    if (!gmailStore.service) {
      toast({
        title: "Error",
        description: "Gmail service not available. Please check your connection.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingReply(true);

    try {
      // Construct reply subject using target email
      const originalSubject = targetEmail?.subject || '';
      const replySubject = originalSubject.startsWith('Re: ') 
        ? originalSubject 
        : `Re: ${originalSubject}`;

      // Send reply via Gmail API
      const result = await gmailStore.service.sendEmail({
        to: [fromEmail],
        subject: replySubject,
        bodyHtml: replyContent,
      });

      // ✅ Create optimistic reply email for immediate feedback
      if (addOptimisticEmail) {
        const optimisticReply: GmailEmail = {
          id: `optimistic-reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          threadId: targetEmail?.threadId || activity.threadId || `thread-${activity.id}`, // ✅ Use real threadId for proper grouping
          subject: replySubject,
          snippet: replyContent.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
          bodyText: replyContent.replace(/<[^>]*>/g, ''),
          bodyHtml: replyContent,
          from: {
            email: gmailStore.accounts[0]?.email || '',
            name: gmailStore.accounts[0]?.email?.split('@')[0] || 'You'
          },
          to: [{ email: fromEmail, name: targetEmail?.from?.name }],
          date: new Date().toISOString(),
          isRead: true,
          isImportant: false,
          labels: ['SENT'],
          attachments: []
        };
        
        addOptimisticEmail(optimisticReply);
      }

      // Clear reply form
      setReplyContent('');
      setIsReplying(false);
      if (replyEditor) {
        replyEditor.commands.setContent('', false);
      }

      toast({
        title: "Reply sent!",
        description: `Reply sent to ${targetEmail?.from?.name || fromEmail}`,
      });

      logger.log("✨ Reply sent successfully:", {
        replyId: result.messageId,
        originalEmailId: targetEmail?.id || activity.id,
        threadId: targetEmail?.threadId || 'unknown',
        to: fromEmail,
        subject: replySubject,
        isEmailThread: isEmailThread
      });

    } catch (error) {
      logger.error("Failed to send reply:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "Error",
        description: `Failed to send reply: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSendingReply(false);
    }
  }, [replyContent, activity, gmailStore.service, gmailStore.accounts, addOptimisticEmail, replyEditor, isEmailThread]);

  // ✅ Handle formatting for reply editor
  const handleReplyFormat = useCallback((format: string) => {
    if (!replyEditor) return;

    switch (format) {
      case 'bold':
        replyEditor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        replyEditor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        replyEditor.chain().focus().toggleUnderline().run();
        break;
      case 'strikethrough':
        replyEditor.chain().focus().toggleStrike().run();
        break;
      case 'code':
        replyEditor.chain().focus().toggleCode().run();
        break;
      case 'heading1':
        replyEditor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        replyEditor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        replyEditor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        replyEditor.chain().focus().toggleBulletList().run();
        break;
      case 'numberedList':
        replyEditor.chain().focus().toggleOrderedList().run();
        break;
      case 'quote':
        replyEditor.chain().focus().toggleBlockquote().run();
        break;
      case 'divider':
        replyEditor.chain().focus().setHorizontalRule().run();
        break;
    }
  }, [replyEditor]);

  const handleReplyLinkRequest = useCallback((url: string, linkText: string) => {
    if (!replyEditor) return;

    if (url && linkText) {
      replyEditor.chain().focus().setLink({ href: url }).insertContent(linkText).run();
    }
  }, [replyEditor]);

  const handleReplyCodeBlockRequest = useCallback((selectedText: string, range: Range) => {
    if (!replyEditor) return;

    const selection = window.getSelection();
    if (selection && range) {
      selection.removeAllRanges();
      selection.addRange(range);
      
      const codeBlock = `\`\`\`\n${selectedText}\n\`\`\``;
      replyEditor.chain().focus().insertContent(codeBlock).run();
    }
  }, [replyEditor]);

  // ✅ NEW: Component for individual emails within a thread
  const ThreadedEmailItem = ({ email, isFirst, isLast }: { 
    email: TimelineActivity; 
    isFirst: boolean; 
    isLast: boolean; 
  }) => (
    <div 
      className={cn(
        "relative border-l-2 border-gray-200 pl-4 pb-4",
        isFirst && "pt-2",
        isLast && "pb-2"
      )}
    >
      {/* Email header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-600">
            {formatRelativeTime(email.timestamp)}
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-medium">
              {email.from?.name || email.from?.email}
            </span>
            {email.to && email.to.length > 0 && (
              <>
                <span className="mx-1">to</span>
                <span>{formatEmailRecipients(email.to, contactName)}</span>
              </>
            )}
          </div>
        </div>
        {/* Email-specific badges */}
        <div className="flex items-center space-x-1">
          {email.isImportant && (
            <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Important" />
          )}
          {!email.isRead && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
          )}
        </div>
      </div>
      
      {/* Email content */}
      <div className="text-sm text-gray-700">
        {email.bodyHtml ? (
          <EmailRenderer 
            bodyHtml={email.bodyHtml} 
            bodyText={email.bodyText} 
            subject={email.subject || ''} 
          />
        ) : (
          <div className="whitespace-pre-wrap">
            {email.snippet || email.bodyText || 'No content'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <li ref={timelineRef} className="relative pl-12 pb-8 mb-[40px]">
      {/* Timeline line - simple gray line */}
      <div 
        className={cn(
          "absolute left-[22px] top-[40px] w-[1px] bg-gray-200",
          isLast ? "bottom-[0px]" : "bottom-[-150px]"
        )}
      ></div>
      
      {/* Timeline end indicator for last item */}
      {isLast && (
        <div className="absolute left-[16px] bottom-[0px] w-3 h-3 rounded-full bg-gray-400 border-2 border-white shadow-sm z-10">
          <div className="absolute inset-0 rounded-full bg-gray-400 animate-pulse opacity-75"></div>
        </div>
      )}
      
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
        "relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md",
        "transition-all duration-500 ease-out",
        isExpanded && "shadow-md",
        // Responsive width and padding
        isMobile ? "w-[calc(100%-16px)] p-3" : "w-[calc(100%-20px)] p-4"
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
        <div className={cn(
          "flex items-center text-sm mb-2",
          optimisticPinState && (isMobile ? 'mt-5' : 'mt-6')
        )}>
          <span className={cn("font-medium", activityProps.userNameColor, isMobile ? "ml-5" : "ml-7")}>
            {activityProps.userName}
          </span>
          <span className="text-gray-500 ml-1">
            {(activity.type === 'email' || activity.type === 'email_sent') ? 'emailed' : 
             activity.type === 'email_thread' ? 'email conversation with' :
             activity.type === 'note' ? 'added a note to' :
             activity.type === 'call' ? 'called' :
             activity.type === 'meeting' ? 'met with' :
             activity.type === 'task' ? 'created a task for' :
             `added a ${activity.type} to`}
          </span>
          <span className="text-gray-700 font-medium ml-1">
            {(activity.type === 'email' || activity.type === 'email_sent')
              ? formatEmailRecipients(activity.to, contactName)
              : contactName || 'Contact'}
          </span>
        </div>
        
        {/* Additional email details for multiple recipients */}
        {(activity.type === 'email' || activity.type === 'email_sent') && activity.to && activity.to.length > 1 && (
          <div className={cn("text-xs text-gray-500 mb-2", isMobile ? "pl-5" : "pl-7")}>
            <span className="font-medium">To:</span> {activity.to.map(recipient => recipient.name || recipient.email).join(', ')}
            {activity.cc && activity.cc.length > 0 && (
              <div className="mt-1">
                <span className="font-medium">CC:</span> {activity.cc.map(recipient => recipient.name || recipient.email).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* ✅ NEW: Email thread badge and controls */}
        {isEmailThread && threadEmailCount > 1 && (
          <div className={cn("flex items-center justify-between mb-2", isMobile ? "pl-5" : "pl-7")}>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                📧 {threadEmailCount} emails in conversation
              </span>
              <button
                onClick={() => setIsThreadExpanded(!isThreadExpanded)}
                className="text-blue-600 hover:text-blue-700 transition-colors text-xs font-medium"
              >
                {isThreadExpanded ? (
                  <span className="flex items-center gap-1">
                    <ChevronUp className="w-3 h-3" />
                    Collapse thread
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ChevronDown className="w-3 h-3" />
                    Expand thread
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        
        {/* Activity content */}
        {activityProps.displayContent && (
          <div className={cn("mb-3", isMobile ? "pl-5" : "pl-7")}>
            {isEditing ? (
              /* Edit mode */
              <div className="space-y-3">
                <TiptapEditor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Edit your note..."
                  minHeight={isMobile ? "80px" : "100px"}
                  showToolbar={false}
                  externalToolbar={true}
                  isCompact={isMobile}
                  autoFocus={true}
                  onEditorReady={(editor) => setEditor(editor)}
                />
                {/* Responsive layout: Toolbar + Action Buttons */}
                <div className="border-t border-gray-100 pt-3">
                  {/* Toolbar - responsive wrapper */}
                  <div className={cn(
                    "mb-3 transition-all duration-300 ease-in-out overflow-x-auto scrollbar-hide"
                  )}>
                    <MarkdownToolbar
                      editor={editor}
                      onFormat={handleFormat}
                      onLinkRequest={handleLinkRequest}
                      onCodeBlockRequest={handleCodeBlockRequest}
                      isCompact={isMobile}
                      className={cn(
                        "transition-all duration-300 ease-in-out min-w-max",
                        isMobile ? "p-1" : "p-0"
                      )}
                    />
                  </div>
                  
                  {/* Action Buttons - Responsive layout */}
                  <div className={cn(
                    "flex gap-2",
                    isMobile ? "justify-center" : "justify-end"
                  )}>
                    <button
                      onClick={handleSaveEdit}
                      className={cn(
                        "bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors",
                        isMobile ? "px-4 py-2 flex-1 max-w-[120px]" : "px-3 py-1.5"
                      )}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={cn(
                        "bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors",
                        isMobile ? "px-4 py-2 flex-1 max-w-[120px]" : "px-3 py-1.5"
                      )}
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
                  {/* ✅ NEW: Email thread display */}
                  {isEmailThread && isThreadExpanded ? (
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">
                        Email conversation ({threadEmailCount} emails):
                      </div>
                      {emailsInThread.map((email, index) => (
                        <ThreadedEmailItem
                          key={email.id}
                          email={email}
                          isFirst={index === 0}
                          isLast={index === emailsInThread.length - 1}
                        />
                      ))}
                    </div>
                  ) : isEmailThread && !isThreadExpanded ? (
                    /* Show only latest email when thread is collapsed */
                    <EmailRenderer
                      bodyHtml={activity.latestEmail?.bodyHtml || activity.bodyHtml}
                      bodyText={activity.latestEmail?.bodyText || activity.bodyText}
                      subject={activity.latestEmail?.subject || activity.subject}
                      emailId={activity.latestEmail?.id || activity.id}
                      attachments={activity.latestEmail?.attachments || activity.attachments}
                      activityDetails={activity.details}
                    />
                  ) : (activity.source === 'gmail' && activity.type === 'email') || 
                       (activity.source === 'internal' && activity.type === 'email_sent') ? (
                    /* Regular single email display */
                    <EmailRenderer
                      bodyHtml={activity.bodyHtml}
                      bodyText={activity.bodyText}
                      subject={activity.subject}
                      emailId={activity.id}
                      attachments={activity.attachments}
                      activityDetails={activity.details}
                    />
                  ) : (
                    /* Non-email activity display */
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

        {/* ✅ NEW: Reply editor - show for emails and email threads when replying */}
        {isReplying && (activity.source === 'gmail' && (activity.type === 'email' || activity.type === 'email_thread')) && (
          <div className={cn("mb-3 border-t border-gray-100 pt-3", isMobile ? "pl-5" : "pl-7")}>
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Reply to:</span> {
                  isEmailThread 
                    ? (activity.latestEmail?.from?.name || activity.latestEmail?.from?.email)
                    : (activity.from?.name || activity.from?.email)
                }
              </div>
              
              <TiptapEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder={`Reply to ${
                  isEmailThread 
                    ? (activity.latestEmail?.from?.name || activity.latestEmail?.from?.email)
                    : (activity.from?.name || activity.from?.email)
                }...`}
                minHeight={isMobile ? "80px" : "100px"}
                showToolbar={false}
                externalToolbar={true}
                isCompact={isMobile}
                autoFocus={true}
                onEditorReady={(editor) => setReplyEditor(editor)}
              />
              
              {/* Reply Toolbar + Action Buttons */}
              <div className="border-t border-gray-100 pt-3">
                {/* Toolbar - responsive wrapper */}
                <div className={cn(
                  "mb-3 transition-all duration-300 ease-in-out overflow-x-auto scrollbar-hide"
                )}>
                  <MarkdownToolbar
                    editor={replyEditor}
                    onFormat={handleReplyFormat}
                    onLinkRequest={handleReplyLinkRequest}
                    onCodeBlockRequest={handleReplyCodeBlockRequest}
                    isCompact={isMobile}
                    className={cn(
                      "transition-all duration-300 ease-in-out min-w-max",
                      isMobile ? "p-1" : "p-0"
                    )}
                  />
                </div>
                
                {/* Reply Action Buttons */}
                <div className={cn(
                  "flex gap-2",
                  isMobile ? "justify-center" : "justify-end"
                )}>
                  <button
                    onClick={() => {
                      setIsReplying(false);
                      setReplyContent('');
                      if (replyEditor) {
                        replyEditor.commands.setContent('', false);
                      }
                    }}
                    className={cn(
                      "bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors",
                      isMobile ? "px-4 py-2 flex-1 max-w-[120px]" : "px-3 py-1.5"
                    )}
                    disabled={isSendingReply}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReply}
                    className={cn(
                      "bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50",
                      isMobile ? "px-4 py-2 flex-1 max-w-[120px]" : "px-3 py-1.5"
                    )}
                    disabled={!replyContent.trim() || isSendingReply}
                  >
                    {isSendingReply ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div className={cn("flex items-center justify-between text-xs text-gray-500", isMobile ? "pl-5" : "pl-7")}>
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
          
          {/* Show more/less button and Reply button */}
          {(activityProps.displayContent || activity.bodyHtml || activity.bodyText) && (
            <div className="flex items-center gap-3">
              {/* Reply button - show for emails and email threads when expanded */}
              {isExpanded && (activity.source === 'gmail' && (activity.type === 'email' || activity.type === 'email_thread')) && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-all duration-300 ease-in-out hover:scale-105",
                    isReplying 
                      ? "text-teal-600 hover:text-teal-700" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  disabled={isSendingReply}
                >
                  <Reply className="w-3 h-3" />
                  <span>{isReplying ? 'Cancel' : 'Reply'}</span>
                </button>
              )}
              
              {/* Show more/less button */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-all duration-300 ease-in-out hover:scale-105"
              >
                <span className="transition-all duration-300 text-xs">
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
          
          /* Hide scrollbars while maintaining functionality */
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          
          /* Mobile toolbar improvements */
          @media (max-width: 767px) {
            .timeline-item-toolbar {
              padding: 8px 4px;
              gap: 4px;
            }
            
            .timeline-item-toolbar button {
              min-width: 32px;
              height: 32px;
              flex-shrink: 0;
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
