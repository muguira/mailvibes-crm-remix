import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  CalendarDays,
  AlertCircle,
  Download,
  RefreshCw
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useParams } from "react-router-dom";
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useActivities } from '@/hooks/supabase/use-activities';
import { useGmailConnection } from '@/hooks/use-gmail-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useContactEmails } from '@/hooks/use-contact-emails-v2';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GmailConnectionModal } from '@/components/stream/GmailConnectionModal';
import { TiptapEditor, MarkdownToolbar } from '@/components/markdown';

const ACTIVITY_TYPES = [
  { id: 'call', label: 'Call', icon: Phone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'note', label: 'Note', icon: MessageCircle },
  { id: 'meeting', label: 'Meeting', icon: Calendar },
];

interface TimelineComposerProps {
  contactId?: string;
  isCompact?: boolean;
  onExpand?: () => void;
  onCreateActivity?: (activity: { type: string; content: string; timestamp: string }) => void;
  contactEmail?: string;
  onSyncEmailHistory?: () => Promise<void>;
  syncStatus?: 'idle' | 'syncing' | 'completed' | 'failed';
  emailsCount?: number;
  hasMoreEmails?: boolean;
}

// Custom DateTime picker component
const DateTimePicker = ({ 
  date, 
  onDateChange, 
  time, 
  onTimeChange, 
  isCompact = false 
}: {
  date: Date;
  onDateChange: (date: Date) => void;
  time: string;
  onTimeChange: (time: string) => void;
  isCompact?: boolean;
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const label = formatTime(timeValue);
      timeOptions.push({ value: timeValue, label });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className={`text-gray-500 transition-all duration-300 ease-in-out ${
        isCompact ? 'w-3 h-3' : 'w-4 h-4'
      }`} />
      
      {/* Date Picker */}
      <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`justify-start text-left font-normal transition-all duration-300 ease-in-out ${
              isCompact ? 'text-xs h-7 px-2' : 'text-sm h-8 px-3'
            }`}
          >
            {formatDate(date)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[10000]" align="start">
          <CalendarComponent
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                onDateChange(newDate);
                setIsDateOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Time Picker */}
      <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`justify-start text-left font-normal transition-all duration-300 ease-in-out ${
              isCompact ? 'text-xs h-7 px-2' : 'text-sm h-8 px-3'
            }`}
          >
            {formatTime(time)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[10000]" align="start">
          <div className="max-h-48 overflow-y-auto">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onTimeChange(option.value);
                  setIsTimeOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                  option.value === time ? 'bg-gray-100' : ''
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default function TimelineComposer({ 
  contactId, 
  isCompact = false, 
  onExpand, 
  onCreateActivity, 
  contactEmail,
  onSyncEmailHistory,
  syncStatus = 'idle',
  emailsCount = 0,
  hasMoreEmails = false
}: TimelineComposerProps) {
  const [text, setText] = useState("");
  const [selectedActivityType, setSelectedActivityType] = useState('note');
  const [activityDate, setActivityDate] = useState(new Date());
  const [activityTime, setActivityTime] = useState(() => {
    // Default to current time in HH:MM format
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [isDateTimeManuallySet, setIsDateTimeManuallySet] = useState(false);
  const [editor, setEditor] = useState<any>(null);
  const { recordId } = useParams();
  const effectiveContactId = contactId || recordId;
  const { createActivity } = useActivities(effectiveContactId);
  const { isConnected: isGmailConnected } = useGmailConnection();
  const isMobile = useIsMobile();
  
  // Use provided contactEmail (we'll assume it's passed from parent)
  const effectiveContactEmail = contactEmail;
  
  // Use modern emails hook to get email info and sync capabilities
  const {
    emails,
    loading,
    hasMore,
    syncStatus: internalSyncStatus,
    syncEmailHistory
  } = useContactEmails({
    contactEmail: effectiveContactEmail,
    autoFetch: true,
  });
  
  // Show sync button if we have emails but there are more available (incomplete history)
  const shouldShowSyncButton = isGmailConnected && 
                               effectiveContactEmail && 
                               emails && 
                               emails.length > 0 && 
                               (hasMore || emails.length < 200);

  const handleSend = () => {
    if (text.trim() && effectiveContactId) {
      // Use current date/time if not manually set, otherwise use the selected date/time
      let finalDate = activityDate;
      let finalTime = activityTime;
      
      if (!isDateTimeManuallySet) {
        // Update to current date/time for most recent timestamp
        const now = new Date();
        finalDate = now;
        finalTime = now.toTimeString().slice(0, 5);
      }
      
      // Combine date and time into a proper timestamp
      const year = finalDate.getFullYear();
      const month = finalDate.getMonth();
      const day = finalDate.getDate();
      const [hours, minutes] = finalTime.split(':');
      
      const activityDateTime = new Date(year, month, day, parseInt(hours), parseInt(minutes));
      const activityTimestamp = activityDateTime.toISOString();
      
      logger.log("Activity:", { 
        type: selectedActivityType, 
        content: text, 
        contactId: effectiveContactId,
        timestamp: activityTimestamp,
        wasManuallySet: isDateTimeManuallySet
      });
      
      // Use the provided onCreateActivity prop or fall back to internal createActivity
      if (onCreateActivity) {
        onCreateActivity({
          type: selectedActivityType,
          content: text,
          timestamp: activityTimestamp
        });
      } else {
        // Create activity in Supabase with custom timestamp
        createActivity({
          type: selectedActivityType,
          content: text,
          timestamp: activityTimestamp
        });
      }
      
      // Clear the text after sending
      setText("");
      
      // Also clear the editor directly to ensure it's empty
      if (editor) {
        editor.commands.setContent('', false);
      }
      
      // Reset to current date/time for next activity
      setActivityDate(new Date());
      const now = new Date();
      setActivityTime(now.toTimeString().slice(0, 5));
      setIsDateTimeManuallySet(false);
    }
  };

  const handleFocus = () => {
    // If editor is in compact mode and user clicks to focus, expand it
    if (isCompact && onExpand) {
      onExpand();
    }
  };

  const handleEditorClick = () => {
    // Also expand when clicking anywhere in the editor area
    if (isCompact && onExpand) {
      onExpand();
    }
  };

  const clearContent = () => {
    setText("");
    // Also clear the editor directly to ensure it's empty
    if (editor) {
      editor.commands.setContent('', false);
    }
  };

  // Handle manual date/time changes
  const handleDateChange = (newDate: Date) => {
    setActivityDate(newDate);
    setIsDateTimeManuallySet(true);
  };

  const handleTimeChange = (newTime: string) => {
    setActivityTime(newTime);
    setIsDateTimeManuallySet(true);
  };

  // Handle sync historical emails
  const handleSyncHistoricalEmails = async () => {
    // Use prop function if provided (from StreamTimeline), otherwise use hook function
    if (onSyncEmailHistory) {
      await onSyncEmailHistory();
    } else if (syncEmailHistory) {
      await syncEmailHistory();
    }
  };

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
    <div 
      className="bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-300 ease-in-out"
      onClick={handleEditorClick}
    >
      {/* Activity Type Selector */}
      <div className={`flex items-center gap-1 border-b border-gray-100 transition-all duration-300 ease-in-out ${
        isCompact ? 'p-2' : 'p-3'
      }`}>
        {ACTIVITY_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedActivityType(type.id)}
              className={cn(
                "flex items-center gap-2 rounded-md font-medium transition-all duration-300 ease-in-out",
                selectedActivityType === type.id
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                isCompact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
              )}
            >
              <Icon className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
              {!isCompact && type.label}
            </button>
          );
        })}
      </div>

      {/* Date and Time Selector */}
      <div className={`flex items-center gap-3 border-b border-gray-100 transition-all duration-300 ease-in-out ${
        isCompact ? 'p-2' : 'p-3'
      }`}>
        <DateTimePicker
          date={activityDate}
          onDateChange={handleDateChange}
          time={activityTime}
          onTimeChange={handleTimeChange}
          isCompact={isCompact}
        />
      </div>



      {/* Rich Text Editor */}
      <div className={`outline-none transition-all duration-300 ease-in-out ${
        isCompact ? 'p-0' : 'p-0'
      }`}>
        <TiptapEditor
          value={text}
          onChange={setText}
          placeholder="Type a message..."
          minHeight={isCompact ? "40px" : "80px"}
          showToolbar={false}
          externalToolbar={true}
          isCompact={isCompact}
          autoFocus={false}
          onEditorReady={(editor) => setEditor(editor)}
        />
      </div>

      {/* Horizontal layout: Toolbar + Action Buttons */}
      <div className={`flex items-center border-t border-gray-100 transition-all duration-300 ease-in-out gap-3 ${
        isCompact ? 'p-2' : 'p-3'
      }`}>
        {/* Gmail not connected indicator */}
        {!isGmailConnected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <GmailConnectionModal onRefresh={() => window.location.reload()}>
                <button
                  className={`rounded hover:bg-gray-100 text-amber-500 hover:text-amber-600 transition-all duration-300 ease-in-out flex-shrink-0 ${
                    isCompact ? 'p-1' : 'p-2'
                  }`}
                  title="Gmail not connected"
                >
                  <AlertCircle className={`transition-all duration-300 ease-in-out ${
                    isCompact ? 'w-3 h-3' : 'w-4 h-4'
                  }`} />
                </button>
              </GmailConnectionModal>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">Gmail not connected - Click to connect</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Toolbar - flexible with scroll */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          <MarkdownToolbar
            editor={editor}
            onFormat={handleFormat}
            onLinkRequest={handleLinkRequest}
            onCodeBlockRequest={handleCodeBlockRequest}
            isCompact={isCompact}
            className={cn(
              "transition-all duration-300 ease-in-out min-w-max",
              isCompact ? "p-1" : "p-0"
            )}
          />
        </div>

        {/* Action Buttons - always visible */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={clearContent}
            disabled={!text.trim()}
            className={`transition-all duration-300 ease-in-out ${
              isCompact ? "text-xs px-2 py-1 h-7" : "h-8"
            }`}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!text.trim()}
            onClick={handleSend}
            className={`bg-teal-600 hover:bg-teal-700 transition-all duration-300 ease-in-out ${
              isCompact ? "text-xs px-2 py-1 h-7" : "h-8"
            }`}
          >
            Ok
          </Button>
        </div>
      </div>

      {/* Add scrollbar styles for horizontal scroll */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `
      }} />
    </div>
  );
}
