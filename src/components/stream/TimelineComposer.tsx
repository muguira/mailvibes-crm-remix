import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  MoreHorizontal,
  CalendarDays,
  Clock,
  AlertCircle
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useParams } from "react-router-dom";
import { mockContactsById } from "@/components/stream/sample-data";
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useActivities } from '@/hooks/supabase/use-activities';
import { useGmailConnection } from '@/hooks/use-gmail-auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GmailConnectionModal } from '@/components/stream/GmailConnectionModal';

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

  // Generate time options (every 15 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
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
            <Clock className={`mr-1 transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
            {formatTime(time)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-0 z-[10000]" align="start">
          <div className="max-h-70 overflow-y-auto">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onTimeChange(option.value);
                  setIsTimeOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-gray-100 hover:text-gray-900 transition-colors",
                  option.value === time && "bg-gray-100 text-gray-900"
                )}
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

export default function TimelineComposer({ contactId, isCompact = false, onExpand, onCreateActivity }: TimelineComposerProps) {
  const [text, setText] = useState("");
  const [selectedActivityType, setSelectedActivityType] = useState('note');
  const [activityDate, setActivityDate] = useState(new Date());
  const [activityTime, setActivityTime] = useState(() => {
    // Default to current time in HH:MM format
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const editableRef = useRef<HTMLDivElement>(null);
  const { recordId } = useParams();
  const effectiveContactId = contactId || recordId;
  const { createActivity } = useActivities(effectiveContactId);
  const { isConnected: isGmailConnected } = useGmailConnection();
  
  // Convert HTML back to plain text for storage
  const getPlainText = () => {
    if (!editableRef.current) return text;
    
    let plainText = editableRef.current.innerHTML;
    
    // Convert HTML back to markdown
    plainText = plainText.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    plainText = plainText.replace(/<em>(.*?)<\/em>/g, '*$1*');
    plainText = plainText.replace(/<u>(.*?)<\/u>/g, '__$1__');
    plainText = plainText.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');
    plainText = plainText.replace(/<br\s*\/?>/g, '\n');
    plainText = plainText.replace(/<div>/g, '\n');
    plainText = plainText.replace(/<\/div>/g, '');
    plainText = plainText.replace(/<ul[^>]*>/g, '');
    plainText = plainText.replace(/<\/ul>/g, '');
    plainText = plainText.replace(/<ol[^>]*>/g, '');
    plainText = plainText.replace(/<li[^>]*>(.*?)<\/li>/g, '• $1\n');
    
    // Clean up extra whitespace
    plainText = plainText.replace(/&nbsp;/g, ' ');
    plainText = plainText.trim();
    
    return plainText;
  };

  const handleSend = () => {
    const plainText = getPlainText();
    if (plainText.trim() && effectiveContactId) {
      // Combine date and time into a proper timestamp
      const year = activityDate.getFullYear();
      const month = activityDate.getMonth();
      const day = activityDate.getDate();
      const [hours, minutes] = activityTime.split(':');
      
      const activityDateTime = new Date(year, month, day, parseInt(hours), parseInt(minutes));
      const activityTimestamp = activityDateTime.toISOString();
      
      logger.log("Activity:", { 
        type: selectedActivityType, 
        content: plainText, 
        contactId: effectiveContactId,
        timestamp: activityTimestamp
      });
      
      // Use the provided onCreateActivity prop or fall back to internal createActivity
      if (onCreateActivity) {
        onCreateActivity({
          type: selectedActivityType,
          content: plainText,
          timestamp: activityTimestamp
        });
      } else {
        // Create activity in Supabase with custom timestamp
        createActivity({
          type: selectedActivityType,
          content: plainText,
          timestamp: activityTimestamp
        });
      }
      
      // Clear the text after sending
      setText("");
      if (editableRef.current) {
        editableRef.current.innerHTML = '';
      }
      
      // Reset to current date/time for next activity
      setActivityDate(new Date());
      const now = new Date();
      setActivityTime(now.toTimeString().slice(0, 5));
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const plainText = getPlainText();
      if (plainText.trim()) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleFormatting = (format: string) => {
    const selection = window.getSelection();
    if (!selection || !editableRef.current) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    // Focus the editable div
    editableRef.current.focus();

    switch (format) {
      case 'bold':
        document.execCommand('bold', false);
        break;
        
      case 'italic':
        document.execCommand('italic', false);
        break;
        
      case 'underline':
        document.execCommand('underline', false);
        break;
        
      case 'bulletList':
        document.execCommand('insertUnorderedList', false);
        break;
        
      case 'numberedList':
        document.execCommand('insertOrderedList', false);
        break;
        
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
        
      default:
        return;
    }

    // Update the text state
    setTimeout(() => {
      setText(getPlainText());
    }, 0);
  };

  const handleInput = () => {
    setText(getPlainText());
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
    if (editableRef.current) {
      editableRef.current.innerHTML = '';
    }
  };

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
          onDateChange={setActivityDate}
          time={activityTime}
          onTimeChange={setActivityTime}
          isCompact={isCompact}
        />
      </div>

      {/* Rich Text Editor */}
      <div className={`transition-all duration-300 ease-in-out ${
        isCompact ? 'p-2' : 'p-4'
      }`}>
        <div
          ref={editableRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          className={`w-full focus:outline-none text-sm text-gray-900 prose prose-sm max-w-none rich-text-editor transition-all duration-300 ease-in-out ${
            isCompact ? 'min-h-[40px]' : 'min-h-[80px]'
          }`}
          style={{ 
            border: 'none',
            resize: 'none'
          }}
          data-placeholder="Type a message..."
          suppressContentEditableWarning={true}
        />
        
        {/* Placeholder styling */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .rich-text-editor:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
            }
          `
        }} />
      </div>

      {/* Formatting Toolbar */}
      <div className={`flex items-center justify-between border-t border-gray-100 transition-all duration-300 ease-in-out ${
        isCompact ? 'p-2' : 'p-3'
      }`}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleFormatting('bold')}
            className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out ${
              isCompact ? 'p-1' : 'p-2'
            }`}
            title="Bold"
          >
            <Bold className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
          <button
            onClick={() => handleFormatting('italic')}
            className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out ${
              isCompact ? 'p-1' : 'p-2'
            }`}
            title="Italic"
          >
            <Italic className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
          <button
            onClick={() => handleFormatting('underline')}
            className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out ${
              isCompact ? 'p-1' : 'p-2'
            }`}
            title="Underline"
          >
            <Underline className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <button
            onClick={() => handleFormatting('bulletList')}
            className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out ${
              isCompact ? 'p-1' : 'p-2'
            }`}
            title="Bullet List"
          >
            <List className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
          <button
            onClick={() => handleFormatting('numberedList')}
            className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out ${
              isCompact ? 'p-1' : 'p-2'
            }`}
            title="Numbered List"
          >
            <ListOrdered className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <button
            onClick={() => handleFormatting('link')}
            className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out ${
              isCompact ? 'p-1' : 'p-2'
            }`}
            title="Add Link"
          >
            <Link className={`transition-all duration-300 ease-in-out ${
              isCompact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
          </button>
        </div>

        {/* Gmail not connected indicator */}
        {!isGmailConnected && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <GmailConnectionModal onRefresh={() => window.location.reload()}>
                  <button
                    className={`rounded hover:bg-gray-100 text-amber-500 hover:text-amber-600 ml-auto mr-2 transition-all duration-300 ease-in-out ${
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
          </TooltipProvider>
        )}

        {/* More button */}
        <button
          className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 ${!isGmailConnected ? 'mr-2' : 'ml-auto mr-2'} transition-all duration-300 ease-in-out ${
            isCompact ? 'p-1' : 'p-2'
          }`}
          title="More options"
        >
          <MoreHorizontal className={`transition-all duration-300 ease-in-out ${
            isCompact ? 'w-3 h-3' : 'w-4 h-4'
          }`} />
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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
    </div>
  );
}
