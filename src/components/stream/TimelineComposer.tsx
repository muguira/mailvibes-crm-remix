import React, { useState, useRef, useEffect } from 'react';
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
  AlertCircle,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Code2,
  Quote,
  Strikethrough,
  Minus
} from "lucide-react";
import LinkModal from './LinkModal';
import CodeBlockModal from './CodeBlockModal';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useParams } from "react-router-dom";
import { mockContactsById } from "@/components/stream/sample-data";
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useActivities } from '@/hooks/supabase/use-activities';
import { useGmailConnection } from '@/hooks/use-gmail-auth';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [isDateTimeManuallySet, setIsDateTimeManuallySet] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedTextForLink, setSelectedTextForLink] = useState('');
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [isCodeBlockModalOpen, setIsCodeBlockModalOpen] = useState(false);
  const [selectedTextForCode, setSelectedTextForCode] = useState('');
  const [currentCodeRange, setCurrentCodeRange] = useState<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(() => {
    // Initialize from localStorage or default to false
    if (typeof window !== 'undefined') {
      return localStorage.getItem('timeline-toolbar-expanded') === 'true';
    }
    return false;
  });
  const editableRef = useRef<HTMLDivElement>(null);
  const { recordId } = useParams();
  const effectiveContactId = contactId || recordId;
  const { createActivity } = useActivities(effectiveContactId);
  const { isConnected: isGmailConnected } = useGmailConnection();
  const isMobile = useIsMobile();
  
  const cleanupMarginsAndFormatting = () => {
    if (!editableRef.current) return;
    
    // Find all normal paragraphs and ensure they have no margins
    const normalParagraphs = editableRef.current.querySelectorAll('.normal-paragraph');
    normalParagraphs.forEach(paragraph => {
      const element = paragraph as HTMLElement;
      element.style.cssText = 'margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;';
    });
    
    // Find all divs that come after lists and ensure they have no margins
    const lists = editableRef.current.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const nextSibling = list.nextElementSibling;
      if (nextSibling && nextSibling.tagName.toLowerCase() === 'div') {
        const element = nextSibling as HTMLElement;
        // Add normal-paragraph class if not already present
        if (!element.classList.contains('normal-paragraph')) {
          element.classList.add('normal-paragraph');
          element.style.cssText = 'margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;';
        }
      }
    });
    
    // More aggressive cleanup: find ALL divs that are not inside lists and reset their margins
    const allDivs = editableRef.current.querySelectorAll('div');
    allDivs.forEach(div => {
      const element = div as HTMLElement;
      // Check if this div is not inside a list and not a special element
      const isInsideList = element.closest('ul, ol');
      const isHeading = element.closest('h1, h2, h3, h4, h5, h6');
      const isBlockquote = element.closest('blockquote');
      const isPre = element.closest('pre');
      
      if (!isInsideList && !isHeading && !isBlockquote && !isPre) {
        // This is a standalone div, ensure it has no margins
        element.classList.add('normal-paragraph');
        element.style.cssText = 'margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important; box-sizing: border-box !important;';
      }
    });
  };
  
  // Set up MutationObserver to clean up margins whenever DOM changes
  useEffect(() => {
    if (!editableRef.current) return;
    
    const observer = new MutationObserver((mutations) => {
      let shouldCleanup = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          shouldCleanup = true;
        }
      });
      
      if (shouldCleanup) {
        // Debounce the cleanup to avoid too many calls
        setTimeout(() => {
          cleanupMarginsAndFormatting();
        }, 10);
      }
    });
    
    observer.observe(editableRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Convert HTML back to plain text for storage
  const getPlainText = () => {
    if (!editableRef.current) return text;
    
    let plainText = editableRef.current.innerHTML;
    
    // Convert HTML back to markdown
    // Headings
    plainText = plainText.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1');
    plainText = plainText.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1');
    plainText = plainText.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1');
    plainText = plainText.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1');
    plainText = plainText.replace(/<h5[^>]*>(.*?)<\/h5>/g, '##### $1');
    plainText = plainText.replace(/<h6[^>]*>(.*?)<\/h6>/g, '###### $1');
    
    // Text formatting
    plainText = plainText.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**');
    plainText = plainText.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**');
    plainText = plainText.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*');
    plainText = plainText.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*');
    plainText = plainText.replace(/<u[^>]*>(.*?)<\/u>/g, '__$1__');
    plainText = plainText.replace(/<del[^>]*>(.*?)<\/del>/g, '~~$1~~');
    plainText = plainText.replace(/<s[^>]*>(.*?)<\/s>/g, '~~$1~~');
    plainText = plainText.replace(/<strike[^>]*>(.*?)<\/strike>/g, '~~$1~~');
    
    // Code - Enhanced for new visual elements
    plainText = plainText.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`');
    // Handle code blocks with language labels
    plainText = plainText.replace(/<pre[^>]*><span[^>]*>([^<]*)<\/span><code[^>]*>(.*?)<\/code><\/pre>/gs, '```$1\n$2\n```');
    // Handle code blocks without language labels
    plainText = plainText.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, '```\n$1\n```');
    
    // Blockquotes
    plainText = plainText.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '> $1');
    
    // Links
    plainText = plainText.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');
    
    // Lists - Enhanced to handle nested lists and proper indentation
    // First, handle nested lists with proper indentation
    plainText = plainText.replace(/<ul[^>]*class="[^"]*"[^>]*>(.*?)<\/ul>/gs, (match, content) => {
      // Count nesting level based on surrounding ul/ol tags
      const beforeMatch = plainText.substring(0, plainText.indexOf(match));
      const nestLevel = (beforeMatch.match(/<ul[^>]*>/g) || []).length - (beforeMatch.match(/<\/ul>/g) || []).length;
      const indent = '  '.repeat(nestLevel);
      
      // Replace li items with bullet points
      let listContent = content.replace(/<li[^>]*>(.*?)<\/li>/gs, (liMatch, liContent) => {
        return `${indent}• ${liContent.trim()}\n`;
      });
      
      return listContent;
    });
    
    plainText = plainText.replace(/<ol[^>]*class="[^"]*"[^>]*>(.*?)<\/ol>/gs, (match, content) => {
      // Count nesting level based on surrounding ul/ol tags
      const beforeMatch = plainText.substring(0, plainText.indexOf(match));
      const nestLevel = (beforeMatch.match(/<ol[^>]*>/g) || []).length - (beforeMatch.match(/<\/ol>/g) || []).length;
      const indent = '  '.repeat(nestLevel);
      
      // Replace li items with numbered points
      let counter = 1;
      let listContent = content.replace(/<li[^>]*>(.*?)<\/li>/gs, (liMatch, liContent) => {
        return `${indent}${counter++}. ${liContent.trim()}\n`;
      });
      
      return listContent;
    });
    
    // Clean up any remaining list tags
    plainText = plainText.replace(/<\/?[uo]l[^>]*>/g, '');
    plainText = plainText.replace(/<li[^>]*>(.*?)<\/li>/g, '• $1\n');
    
    // Horizontal rules
    plainText = plainText.replace(/<hr[^>]*>/g, '---');
    
    // Line breaks and divs
    plainText = plainText.replace(/<br\s*\/?>/g, '\n');
    plainText = plainText.replace(/<div[^>]*>/g, '\n');
    plainText = plainText.replace(/<\/div>/g, '');
    plainText = plainText.replace(/<p[^>]*>/g, '');
    plainText = plainText.replace(/<\/p>/g, '\n');
    
    // Clean up HTML entities and extra whitespace
    plainText = plainText.replace(/&nbsp;/g, ' ');
    plainText = plainText.replace(/&amp;/g, '&');
    plainText = plainText.replace(/&lt;/g, '<');
    plainText = plainText.replace(/&gt;/g, '>');
    plainText = plainText.replace(/&quot;/g, '"');
    plainText = plainText.replace(/&#39;/g, "'");
    
    // Clean up extra newlines and whitespace
    plainText = plainText.replace(/\n\s*\n\s*\n/g, '\n\n');
    plainText = plainText.trim();
    
    return plainText;
  };

  const handleSend = () => {
    const plainText = getPlainText();
    if (plainText.trim() && effectiveContactId) {
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
        content: plainText, 
        contactId: effectiveContactId,
        timestamp: activityTimestamp,
        wasManuallySet: isDateTimeManuallySet
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
      setIsDateTimeManuallySet(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const currentElement = range.startContainer.parentElement;
        
        // Check if we're inside a heading
        const heading = currentElement?.closest('h1, h2, h3, h4, h5, h6');
        if (heading && !e.shiftKey) {
          // Regular Enter in heading: exit heading and create normal text
          e.preventDefault();
          
          // Create a new paragraph element after the heading
          const newParagraph = document.createElement('div');
          newParagraph.className = 'normal-paragraph'; // Specific class for normal paragraphs
          newParagraph.style.cssText = 'margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;';
          newParagraph.innerHTML = '<br>'; // Start with a line break for cursor positioning
          
          // Insert after the heading
          if (heading.nextSibling) {
            heading.parentNode?.insertBefore(newParagraph, heading.nextSibling);
          } else {
            heading.parentNode?.appendChild(newParagraph);
          }
          
          // Move cursor to the new paragraph
          const newRange = document.createRange();
          newRange.setStart(newParagraph, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          // Update the text state and detect active formats
          setTimeout(() => {
            setText(getPlainText());
            cleanupMarginsAndFormatting();
            detectActiveFormats();
          }, 0);
          
          return;
        }
        
        // Check if we're inside a list item
        const listItem = currentElement?.closest('li');
        const list = listItem?.parentElement;
        
        if (listItem && list) {
          if (e.shiftKey) {
            // Shift + Enter in list: check if list item is empty
            const listItemText = listItem.textContent?.trim();
            if (!listItemText || listItemText === '') {
              // Empty list item with Shift+Enter: exit list completely
              e.preventDefault();
              
              // Remove the empty list item first
              listItem.remove();
              
              // Check if list is now empty and remove it
              if (list.children.length === 0) {
                // Create a new paragraph element to replace the entire list
                const newParagraph = document.createElement('div');
                newParagraph.className = 'normal-paragraph';
                newParagraph.style.cssText = 'margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;';
                newParagraph.innerHTML = '<br>';
                
                // Replace the list with the paragraph
                if (list.parentNode) {
                  list.parentNode.replaceChild(newParagraph, list);
                }
                
                // Move cursor to the new paragraph
                const newRange = document.createRange();
                newRange.setStart(newParagraph, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              } else {
                // List still has items, create paragraph after the list
                const newParagraph = document.createElement('div');
                newParagraph.className = 'normal-paragraph';
                newParagraph.style.cssText = 'margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;';
                newParagraph.innerHTML = '<br>';
                
                // Insert after the list
                if (list.nextSibling) {
                  list.parentNode?.insertBefore(newParagraph, list.nextSibling);
                } else {
                  list.parentNode?.appendChild(newParagraph);
                }
                
                // Move cursor to the new paragraph
                const newRange = document.createRange();
                newRange.setStart(newParagraph, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
              
              // Update the text state and detect active formats
              setTimeout(() => {
                setText(getPlainText());
                cleanupMarginsAndFormatting();
                detectActiveFormats();
              }, 0);
              
              return;
            } else {
              // Shift + Enter in non-empty list item: Add new list item
              e.preventDefault();
              
              const newListItem = document.createElement('li');
              newListItem.className = listItem.className;
              newListItem.innerHTML = '<br>'; // Start with a line break for cursor positioning
              
              // Insert after current list item
              if (listItem.nextSibling) {
                list.insertBefore(newListItem, listItem.nextSibling);
              } else {
                list.appendChild(newListItem);
              }
              
              // Move cursor to the new list item
              const newRange = document.createRange();
              newRange.setStart(newListItem, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
              // Update the text state
              setTimeout(() => {
                setText(getPlainText());
              }, 0);
              
              return;
            }
          } else {
            // Regular Enter in list: send message (normal behavior)
            const plainText = getPlainText();
            if (plainText.trim()) {
              e.preventDefault();
              handleSend();
              return;
            }
          }
        } else if (!e.shiftKey) {
          // Regular Enter: Send message if there's content
          const plainText = getPlainText();
          if (plainText.trim()) {
            e.preventDefault();
            handleSend();
            return;
          }
        }
      }
    }
    
    // Handle Backspace in empty list items
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const currentElement = range.startContainer.parentElement;
        const listItem = currentElement?.closest('li');
        
        // If we're at the start of an empty list item, remove it
        if (listItem && range.startOffset === 0 && listItem.textContent?.trim() === '') {
          e.preventDefault();
          
          const list = listItem.parentElement;
          const prevItem = listItem.previousElementSibling as HTMLElement;
          
          if (prevItem) {
            // Move cursor to end of previous item
            const newRange = document.createRange();
            newRange.selectNodeContents(prevItem);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
          
          // Remove the empty list item
          listItem.remove();
          
          // If list is now empty, remove the list entirely
          if (list && list.children.length === 0) {
            list.remove();
          }
          
          // Update the text state
          setTimeout(() => {
            setText(getPlainText());
          }, 0);
          
          return;
        }
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
        
      case 'strikethrough':
        document.execCommand('strikeThrough', false);
        break;
        
      case 'bulletList':
        // Check if we're already in a list
        const currentListItem = range.startContainer.parentElement?.closest('li');
        const currentList = currentListItem?.parentElement;
        
        if (currentListItem && currentList?.tagName === 'UL') {
          // If already in a bullet list, exit list mode (Slack-style behavior)
          // Create a new paragraph after the list
          const newParagraph = document.createElement('div');
          newParagraph.className = 'normal-paragraph';
          newParagraph.style.cssText = 'margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;';
          newParagraph.innerHTML = '<br>';
          
          // Insert the paragraph after the list
          if (currentList.nextSibling) {
            currentList.parentNode?.insertBefore(newParagraph, currentList.nextSibling);
          } else {
            currentList.parentNode?.appendChild(newParagraph);
          }
          
          // Move cursor to the new paragraph
          const newRange = document.createRange();
          newRange.setStart(newParagraph, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          // Update text state and clean up formatting
          setTimeout(() => {
            setText(getPlainText());
            cleanupMarginsAndFormatting();
            detectActiveFormats();
          }, 0);
        } else {
          // Create new list
          const ul = document.createElement('ul');
          ul.className = 'list-disc list-outside space-y-1 my-3 pl-6';
          
          const li = document.createElement('li');
          li.className = 'mb-1';
          li.textContent = selectedText || '';
          ul.appendChild(li);
          
          if (selectedText) {
            range.deleteContents();
          }
          range.insertNode(ul);
          
          // Move cursor to the list item
          const newRange = document.createRange();
          if (selectedText) {
            newRange.setStartAfter(li.firstChild || li);
          } else {
            newRange.setStart(li, 0);
          }
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        break;
        
      case 'numberedList':
        // Check if we're already in a numbered list
        const currentNumberedItem = range.startContainer.parentElement?.closest('li');
        const currentNumberedList = currentNumberedItem?.parentElement;
        
        if (currentNumberedItem && currentNumberedList?.tagName === 'OL') {
          // If already in a numbered list, exit list mode (Slack-style behavior)
          // Create a new paragraph after the list
          const newParagraph = document.createElement('div');
          newParagraph.className = 'normal-paragraph';
          newParagraph.style.cssText = 'margin: 0 !important; padding: 0 !important; margin-left: 0 !important; padding-left: 0 !important; list-style: none !important; text-indent: 0 !important; position: static !important; left: auto !important; transform: none !important; display: block !important;';
          newParagraph.innerHTML = '<br>';
          
          // Insert the paragraph after the list
          if (currentNumberedList.nextSibling) {
            currentNumberedList.parentNode?.insertBefore(newParagraph, currentNumberedList.nextSibling);
          } else {
            currentNumberedList.parentNode?.appendChild(newParagraph);
          }
          
          // Move cursor to the new paragraph
          const newRange = document.createRange();
          newRange.setStart(newParagraph, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          
          // Update text state and clean up formatting
          setTimeout(() => {
            setText(getPlainText());
            cleanupMarginsAndFormatting();
            detectActiveFormats();
          }, 0);
        } else {
          // Create new numbered list
          const ol = document.createElement('ol');
          ol.className = 'list-decimal list-outside space-y-1 my-3 pl-6';
          
          const li = document.createElement('li');
          li.className = 'mb-1';
          li.textContent = selectedText || '';
          ol.appendChild(li);
          
          if (selectedText) {
            range.deleteContents();
          }
          range.insertNode(ol);
          
          // Move cursor to the list item
          const newRange = document.createRange();
          if (selectedText) {
            newRange.setStartAfter(li.firstChild || li);
          } else {
            newRange.setStart(li, 0);
          }
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        break;
        
      case 'link':
        // Store the current range and selected text for the modal
        setCurrentRange(range.cloneRange());
        setSelectedTextForLink(selectedText);
        setIsLinkModalOpen(true);
        break;
        
      case 'heading1':
        // Check if we're already in an H1
        const currentH1 = range.startContainer.parentElement?.closest('h1');
        if (currentH1) {
          // If already in H1, convert back to normal text
          const textContent = currentH1.textContent || '';
          const textNode = document.createTextNode(textContent);
          currentH1.parentNode?.replaceChild(textNode, currentH1);
          
          // Position cursor after the text
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          if (selectedText) {
            // Convert selected text to H1
            const h1Element = document.createElement('h1');
            h1Element.className = 'text-2xl font-bold mb-2 mt-4 text-gray-900';
            h1Element.textContent = selectedText;
            range.deleteContents();
            range.insertNode(h1Element);
            range.setStartAfter(h1Element);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // No text selected: create empty H1 and position cursor inside
            const h1Element = document.createElement('h1');
            h1Element.className = 'text-2xl font-bold mb-2 mt-4 text-gray-900';
            h1Element.innerHTML = '<br>'; // Empty but allows cursor positioning
            range.insertNode(h1Element);
            
            // Position cursor inside the H1
            const newRange = document.createRange();
            newRange.setStart(h1Element, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
        break;
        
      case 'heading2':
        // Check if we're already in an H2
        const currentH2 = range.startContainer.parentElement?.closest('h2');
        if (currentH2) {
          // If already in H2, convert back to normal text
          const textContent = currentH2.textContent || '';
          const textNode = document.createTextNode(textContent);
          currentH2.parentNode?.replaceChild(textNode, currentH2);
          
          // Position cursor after the text
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          if (selectedText) {
            // Convert selected text to H2
            const h2Element = document.createElement('h2');
            h2Element.className = 'text-xl font-bold mb-2 mt-3 text-gray-900';
            h2Element.textContent = selectedText;
            range.deleteContents();
            range.insertNode(h2Element);
            range.setStartAfter(h2Element);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // No text selected: create empty H2 and position cursor inside
            const h2Element = document.createElement('h2');
            h2Element.className = 'text-xl font-bold mb-2 mt-3 text-gray-900';
            h2Element.innerHTML = '<br>'; // Empty but allows cursor positioning
            range.insertNode(h2Element);
            
            // Position cursor inside the H2
            const newRange = document.createRange();
            newRange.setStart(h2Element, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
        break;
        
      case 'heading3':
        // Check if we're already in an H3
        const currentH3 = range.startContainer.parentElement?.closest('h3');
        if (currentH3) {
          // If already in H3, convert back to normal text
          const textContent = currentH3.textContent || '';
          const textNode = document.createTextNode(textContent);
          currentH3.parentNode?.replaceChild(textNode, currentH3);
          
          // Position cursor after the text
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          if (selectedText) {
            // Convert selected text to H3
            const h3Element = document.createElement('h3');
            h3Element.className = 'text-lg font-bold mb-2 mt-3 text-gray-900';
            h3Element.textContent = selectedText;
            range.deleteContents();
            range.insertNode(h3Element);
            range.setStartAfter(h3Element);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // No text selected: create empty H3 and position cursor inside
            const h3Element = document.createElement('h3');
            h3Element.className = 'text-lg font-bold mb-2 mt-3 text-gray-900';
            h3Element.innerHTML = '<br>'; // Empty but allows cursor positioning
            range.insertNode(h3Element);
            
            // Position cursor inside the H3
            const newRange = document.createRange();
            newRange.setStart(h3Element, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
        break;
        
      case 'code':
        if (selectedText) {
          const codeElement = document.createElement('code');
          codeElement.className = 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono';
          codeElement.textContent = selectedText;
          range.deleteContents();
          range.insertNode(codeElement);
          range.setStartAfter(codeElement);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          const codeElement = document.createElement('code');
          codeElement.className = 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono';
          codeElement.textContent = 'código';
          range.insertNode(codeElement);
          // Select the text content for editing
          const textNode = codeElement.firstChild;
          if (textNode) {
            range.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        break;
        
      case 'codeblock':
        // Store the current range and selected text for the modal
        setCurrentCodeRange(range.cloneRange());
        setSelectedTextForCode(selectedText);
        setIsCodeBlockModalOpen(true);
        break;
        
      case 'quote':
        if (selectedText) {
          const blockquoteElement = document.createElement('blockquote');
          blockquoteElement.className = 'border-l-4 border-teal-500 pl-4 py-2 my-2 bg-teal-50 text-gray-700 italic';
          blockquoteElement.textContent = selectedText;
          range.deleteContents();
          range.insertNode(blockquoteElement);
          range.setStartAfter(blockquoteElement);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          const blockquoteElement = document.createElement('blockquote');
          blockquoteElement.className = 'border-l-4 border-teal-500 pl-4 py-2 my-2 bg-teal-50 text-gray-700 italic';
          blockquoteElement.textContent = 'Escribe tu cita aquí';
          range.insertNode(blockquoteElement);
          // Select the text content for editing
          const textNode = blockquoteElement.firstChild;
          if (textNode) {
            range.selectNodeContents(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        break;
        
      case 'divider':
        const hrElement = document.createElement('hr');
        hrElement.className = 'border-t border-gray-300 my-4';
        range.deleteContents();
        range.insertNode(hrElement);
        
        // Add a line break after the hr for better formatting
        const brElement = document.createElement('br');
        range.setStartAfter(hrElement);
        range.insertNode(brElement);
        range.setStartAfter(brElement);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
        
      default:
        return;
    }

    // Update the text state and detect active formats
    setTimeout(() => {
      setText(getPlainText());
      detectActiveFormats();
    }, 0);
  };

  const handleInput = () => {
    setText(getPlainText());
    
    // Update date/time to current when user starts typing (if not manually set)
    if (!isDateTimeManuallySet && getPlainText().trim()) {
      const now = new Date();
      setActivityDate(now);
      setActivityTime(now.toTimeString().slice(0, 5));
    }
    
    // Detect active formats after input
    setTimeout(() => {
      cleanupMarginsAndFormatting();
      detectActiveFormats();
    }, 0);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    
    // Convert pasted markdown to HTML for visual preview
    let htmlContent = pastedText;
    
    // Process markdown elements in order of complexity
    
    // 1. Code blocks (process first to avoid interference)
    htmlContent = htmlContent.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang ? `<span class="text-xs text-gray-500 mb-1 block">${lang}</span>` : '';
      return `<pre class="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto my-2">${language}<code class="text-sm font-mono">${code.trim()}</code></pre>`;
    });
    
    // 2. Headers (process before other formatting)
    htmlContent = htmlContent.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-2 mt-4 text-gray-900">$1</h1>');
    htmlContent = htmlContent.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mb-2 mt-3 text-gray-900">$1</h2>');
    htmlContent = htmlContent.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mb-2 mt-3 text-gray-900">$1</h3>');
    htmlContent = htmlContent.replace(/^#### (.+)$/gm, '<h4 class="text-base font-bold mb-1 mt-2 text-gray-900">$1</h4>');
    htmlContent = htmlContent.replace(/^##### (.+)$/gm, '<h5 class="text-sm font-bold mb-1 mt-2 text-gray-900">$1</h5>');
    htmlContent = htmlContent.replace(/^###### (.+)$/gm, '<h6 class="text-xs font-bold mb-1 mt-2 text-gray-900">$1</h6>');
    
    // 3. Blockquotes
    htmlContent = htmlContent.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-teal-500 pl-4 py-2 my-2 bg-teal-50 text-gray-700 italic">$1</blockquote>');
    
    // 4. Horizontal rules
    htmlContent = htmlContent.replace(/^---$/gm, '<hr class="border-t border-gray-300 my-4">');
    
    // 5. Text formatting (process in order to avoid conflicts)
    // Bold text
    htmlContent = htmlContent.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    
    // Italic text
    htmlContent = htmlContent.replace(/\*(.+?)\*/g, '<em class="italic text-gray-800">$1</em>');
    
    // Strikethrough
    htmlContent = htmlContent.replace(/~~(.+?)~~/g, '<del class="line-through text-gray-500">$1</del>');
    
    // Underline (using markdown extension)
    htmlContent = htmlContent.replace(/__(.+?)__/g, '<u class="underline decoration-2 underline-offset-2">$1</u>');
    
    // 6. Inline code
    htmlContent = htmlContent.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // 7. Links
    htmlContent = htmlContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-teal-600 underline hover:text-teal-800 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 8. Lists processing (enhanced from previous version)
    const lines = htmlContent.split('\n');
    const processedLines = lines.map(line => {
      // Handle nested bullets (with spaces)
      if (/^(\s*)[-*+•] (.+)$/.test(line)) {
        const match = line.match(/^(\s*)[-*+•] (.+)$/);
        if (match) {
          const indent = match[1];
          const content = match[2];
          const level = Math.floor(indent.length / 2);
          return `<li class="ml-${Math.min(level * 4, 12)} mb-1" style="list-style-type: ${level > 0 ? 'circle' : 'disc'};">${content}</li>`;
        }
      }
      // Handle numbered lists
      else if (/^(\s*)(\d+)\. (.+)$/.test(line)) {
        const match = line.match(/^(\s*)(\d+)\. (.+)$/);
        if (match) {
          const indent = match[1];
          const content = match[3];
          const level = Math.floor(indent.length / 2);
          return `<li class="ml-${Math.min(level * 4, 12)} mb-1" style="list-style-type: ${level > 0 ? 'lower-alpha' : 'decimal'};">${content}</li>`;
        }
      }
      return line;
    });
    
    // Group consecutive list items
    let processedContent = processedLines.join('\n');
    
    // Wrap bullet lists
    processedContent = processedContent.replace(
      /(<li class="[^"]*mb-1[^"]*"[^>]*style="list-style-type: (disc|circle);"[^>]*>.*?<\/li>(\n<li class="[^"]*mb-1[^"]*"[^>]*style="list-style-type: (disc|circle);"[^>]*>.*?<\/li>)*)/gs,
      '<ul class="list-disc list-outside space-y-1 my-3 pl-6">$1</ul>'
    );
    
    // Wrap numbered lists
    processedContent = processedContent.replace(
      /(<li class="[^"]*mb-1[^"]*"[^>]*style="list-style-type: (decimal|lower-alpha);"[^>]*>.*?<\/li>(\n<li class="[^"]*mb-1[^"]*"[^>]*style="list-style-type: (decimal|lower-alpha);"[^>]*>.*?<\/li>)*)/gs,
      '<ol class="list-decimal list-outside space-y-1 my-3 pl-6">$1</ol>'
    );
    
    // 9. Handle line breaks (process last to avoid interference)
    processedContent = processedContent.replace(/\n/g, '<br>');
    
    // Insert the processed content
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedContent;
      
      // Insert each child node
      while (tempDiv.firstChild) {
        range.insertNode(tempDiv.firstChild);
        range.collapse(false);
      }
    }
    
    // Update the text state
    setTimeout(() => {
      setText(getPlainText());
      cleanupMarginsAndFormatting();
    }, 0);
  };

  const handleFocus = () => {
    // If editor is in compact mode and user clicks to focus, expand it
    if (isCompact && onExpand) {
      onExpand();
    }
    
    // Detect active formats on focus
    setTimeout(() => {
      detectActiveFormats();
    }, 0);
  };

  const handleSelectionChange = () => {
    // Detect active formats when selection changes
    detectActiveFormats();
    // Also cleanup margins in case something got messed up
    cleanupMarginsAndFormatting();
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

  // Handle manual date/time changes
  const handleDateChange = (newDate: Date) => {
    setActivityDate(newDate);
    setIsDateTimeManuallySet(true);
  };

  const handleTimeChange = (newTime: string) => {
    setActivityTime(newTime);
    setIsDateTimeManuallySet(true);
  };

  const handleLinkConfirm = (url: string, linkText: string) => {
    if (currentRange && editableRef.current) {
      // Focus the editor
      editableRef.current.focus();
      
      // Restore the selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(currentRange);
        
        // Create link element
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.textContent = linkText;
        linkElement.className = 'text-teal-600 underline hover:text-teal-800 transition-colors';
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        
        // Replace selection with link
        currentRange.deleteContents();
        currentRange.insertNode(linkElement);
        
        // Move cursor after the link
        currentRange.setStartAfter(linkElement);
        currentRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(currentRange);
      }
      
      // Update the text state
      setTimeout(() => {
        setText(getPlainText());
      }, 0);
    }
    
    // Clean up
    setCurrentRange(null);
    setSelectedTextForLink('');
  };

  const handleLinkCancel = () => {
    setCurrentRange(null);
    setSelectedTextForLink('');
    setIsLinkModalOpen(false);
  };

  const handleCodeBlockConfirm = (code: string, language: string) => {
    if (!currentCodeRange || !editableRef.current) return;
    
    // Focus the editable div
    editableRef.current.focus();
    
    // Create the code block elements
    const preElement = document.createElement('pre');
    preElement.className = 'bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto my-2';
    
    const codeElement = document.createElement('code');
    codeElement.className = 'text-sm font-mono';
    codeElement.textContent = code;
    
    // Add language label if provided
    if (language) {
      const langSpan = document.createElement('span');
      langSpan.className = 'text-xs text-gray-500 font-normal mb-1 block';
      langSpan.textContent = language;
      preElement.appendChild(langSpan);
    }
    
    preElement.appendChild(codeElement);
    
    // Insert the code block
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(currentCodeRange);
      currentCodeRange.deleteContents();
      currentCodeRange.insertNode(preElement);
      
      // Position cursor after the code block
      const newRange = document.createRange();
      newRange.setStartAfter(preElement);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    // Clean up
    setIsCodeBlockModalOpen(false);
    setSelectedTextForCode('');
    setCurrentCodeRange(null);
    
    // Update the text state
    setTimeout(() => {
      setText(getPlainText());
      detectActiveFormats();
    }, 0);
  };

  const handleCodeBlockCancel = () => {
    setIsCodeBlockModalOpen(false);
    setSelectedTextForCode('');
    setCurrentCodeRange(null);
  };

  const toggleToolbarExpanded = () => {
    const newExpanded = !isToolbarExpanded;
    setIsToolbarExpanded(newExpanded);
    // Persist state to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeline-toolbar-expanded', newExpanded.toString());
    }
  };

  // Function to detect active formats at cursor position
  const detectActiveFormats = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editableRef.current) {
      setActiveFormats(new Set());
      return;
    }

    const range = selection.getRangeAt(0);
    const activeSet = new Set<string>();

    // Get the current node and its parents
    let currentNode = range.startContainer;
    if (currentNode.nodeType === Node.TEXT_NODE) {
      currentNode = currentNode.parentNode;
    }

    // Traverse up the DOM tree to find formatting elements
    while (currentNode && currentNode !== editableRef.current) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const element = currentNode as Element;
        
        // Check for different format types
        switch (element.tagName.toLowerCase()) {
          case 'strong':
          case 'b':
            activeSet.add('bold');
            break;
          case 'em':
          case 'i':
            activeSet.add('italic');
            break;
          case 'u':
            activeSet.add('underline');
            break;
          case 'del':
          case 's':
          case 'strike':
            activeSet.add('strikethrough');
            break;
          case 'code':
            activeSet.add('code');
            break;
          case 'a':
            activeSet.add('link');
            break;
          case 'h1':
            activeSet.add('heading1');
            break;
          case 'h2':
            activeSet.add('heading2');
            break;
          case 'h3':
            activeSet.add('heading3');
            break;
          case 'blockquote':
            activeSet.add('quote');
            break;
          case 'li':
            const parentList = element.parentElement;
            if (parentList?.tagName.toLowerCase() === 'ul') {
              activeSet.add('bulletList');
            } else if (parentList?.tagName.toLowerCase() === 'ol') {
              activeSet.add('numberedList');
            }
            break;
        }
      }
      currentNode = currentNode.parentNode;
    }

    setActiveFormats(activeSet);
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
          onDateChange={handleDateChange}
          time={activityTime}
          onTimeChange={handleTimeChange}
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
          onPaste={handlePaste}
          onMouseUp={handleSelectionChange}
          onKeyUp={handleSelectionChange}
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
            .rich-text-editor ul {
              list-style-type: disc;
              list-style-position: outside;
              margin: 12px 0;
              padding-left: 24px;
            }
            .rich-text-editor ol {
              list-style-type: decimal;
              list-style-position: outside;
              margin: 12px 0;
              padding-left: 24px;
            }
            .rich-text-editor li {
              margin-bottom: 4px;
              line-height: 1.5;
            }
            .rich-text-editor ul ul {
              list-style-type: circle;
              margin: 4px 0;
            }
            .rich-text-editor ol ol {
              list-style-type: lower-alpha;
              margin: 4px 0;
            }
            .rich-text-editor h1, .rich-text-editor h2, .rich-text-editor h3 {
              margin-top: 16px;
              margin-bottom: 8px;
            }
            .rich-text-editor blockquote {
              margin: 12px 0;
              padding: 8px 16px;
            }
            .rich-text-editor pre {
              margin: 12px 0;
              padding: 16px;
            }
            .rich-text-editor code {
              padding: 2px 6px;
            }
            .rich-text-editor hr {
              margin: 16px 0;
            }
            .rich-text-editor div:not(:has(ul)):not(:has(ol)):not(:has(h1)):not(:has(h2)):not(:has(h3)):not(:has(blockquote)):not(:has(pre)):not(:has(hr)) {
              margin: 0;
              padding: 0;
            }
            .rich-text-editor .normal-paragraph {
              margin: 0 !important;
              padding: 0 !important;
              margin-left: 0 !important;
              padding-left: 0 !important;
              list-style: none !important;
              text-indent: 0 !important;
              position: relative !important;
              left: 0 !important;
              transform: none !important;
              display: block !important;
            }
            .rich-text-editor .normal-paragraph * {
              margin: 0 !important;
              padding: 0 !important;
              margin-left: 0 !important;
              padding-left: 0 !important;
              list-style: none !important;
              text-indent: 0 !important;
              position: static !important;
              left: auto !important;
              transform: none !important;
            }
            /* Reset any inherited styles from lists */
            .rich-text-editor .normal-paragraph,
            .rich-text-editor .normal-paragraph *,
            .rich-text-editor div:not(.normal-paragraph) + .normal-paragraph {
              box-sizing: border-box !important;
              margin-top: 0 !important;
              margin-bottom: 0 !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
              padding-top: 0 !important;
              padding-bottom: 0 !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            /* Force normal flow for paragraphs after lists */
            .rich-text-editor ul + div,
            .rich-text-editor ol + div,
            .rich-text-editor ul + .normal-paragraph,
            .rich-text-editor ol + .normal-paragraph {
              margin: 0 !important;
              padding: 0 !important;
              margin-left: 0 !important;
              padding-left: 0 !important;
              text-indent: 0 !important;
              list-style: none !important;
              position: static !important;
              left: auto !important;
              transform: none !important;
            }
          `
        }} />
      </div>

      {/* Formatting Toolbar */}
      <div className={`flex items-center justify-between border-t border-gray-100 transition-all duration-300 ease-in-out ${
        isCompact ? 'p-2' : 'p-3'
      }`}>
        <div className="flex items-center gap-1 overflow-hidden">
          {/* Basic Tools - Always Visible */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleFormatting('bold')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('bold') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Bold"
            >
              <Bold className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            <button
              onClick={() => handleFormatting('italic')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('italic') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Italic"
            >
              <Italic className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            
            {/* Show more tools on desktop */}
            {!isMobile && (
              <>
                <button
                  onClick={() => handleFormatting('bulletList')}
                  className={`rounded transition-all duration-300 ease-in-out ${
                    activeFormats.has('bulletList') 
                      ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  } ${isCompact ? 'p-1' : 'p-2'}`}
                  title="Bullet List"
                >
                  <List className={`transition-all duration-300 ease-in-out ${
                    isCompact ? 'w-3 h-3' : 'w-4 h-4'
                  }`} />
                </button>
                <button
                  onClick={() => handleFormatting('link')}
                  className={`rounded transition-all duration-300 ease-in-out ${
                    activeFormats.has('link') 
                      ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  } ${isCompact ? 'p-1' : 'p-2'}`}
                  title="Add Link"
                >
                  <Link className={`transition-all duration-300 ease-in-out ${
                    isCompact ? 'w-3 h-3' : 'w-4 h-4'
                  }`} />
                </button>
              </>
            )}
            
            {/* More Button */}
            <button
              onClick={toggleToolbarExpanded}
              className={`rounded transition-all duration-300 ease-in-out ${
                isToolbarExpanded 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'} ml-1`}
              title={isToolbarExpanded ? "Hide advanced tools" : "Show more tools"}
            >
              <MoreHorizontal className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
          </div>

          {/* Advanced Tools - Expandable */}
          <div className={`flex items-center gap-1 transition-all duration-300 ease-in-out overflow-hidden ${
            isToolbarExpanded 
              ? 'max-w-full opacity-100 ml-2' 
              : 'max-w-0 opacity-0 ml-0'
          }`}>
            <div className="w-px h-6 bg-gray-200 mx-2" />
            
            {/* Mobile: Show basic tools in expanded section */}
            {isMobile && (
              <>
                <button
                  onClick={() => handleFormatting('bulletList')}
                  className={`rounded transition-all duration-300 ease-in-out ${
                    activeFormats.has('bulletList') 
                      ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  } ${isCompact ? 'p-1' : 'p-2'}`}
                  title="Bullet List"
                >
                  <List className={`transition-all duration-300 ease-in-out ${
                    isCompact ? 'w-3 h-3' : 'w-4 h-4'
                  }`} />
                </button>
                <button
                  onClick={() => handleFormatting('link')}
                  className={`rounded transition-all duration-300 ease-in-out ${
                    activeFormats.has('link') 
                      ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  } ${isCompact ? 'p-1' : 'p-2'}`}
                  title="Add Link"
                >
                  <Link className={`transition-all duration-300 ease-in-out ${
                    isCompact ? 'w-3 h-3' : 'w-4 h-4'
                  }`} />
                </button>
                
                <div className="w-px h-6 bg-gray-200 mx-2" />
              </>
            )}
            
            <button
              onClick={() => handleFormatting('underline')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('underline') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Underline"
            >
              <Underline className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            <button
              onClick={() => handleFormatting('strikethrough')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('strikethrough') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Strikethrough"
            >
              <Strikethrough className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-2" />
            
            {/* Headings */}
            <button
              onClick={() => handleFormatting('heading1')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('heading1') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Heading 1"
            >
              <Heading1 className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            <button
              onClick={() => handleFormatting('heading2')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('heading2') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Heading 2"
            >
              <Heading2 className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            <button
              onClick={() => handleFormatting('heading3')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('heading3') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Heading 3"
            >
              <Heading3 className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-2" />
            
            <button
              onClick={() => handleFormatting('numberedList')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('numberedList') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Numbered List"
            >
              <ListOrdered className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            
            <div className="w-px h-6 bg-gray-200 mx-2" />
            
            {/* Code and Special Elements */}
            <button
              onClick={() => handleFormatting('code')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('code') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Inline Code"
            >
              <Code className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            <button
              onClick={() => handleFormatting('codeblock')}
              className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out ${
                isCompact ? 'p-1' : 'p-2'
              }`}
              title="Code Block"
            >
              <Code2 className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            <button
              onClick={() => handleFormatting('quote')}
              className={`rounded transition-all duration-300 ease-in-out ${
                activeFormats.has('quote') 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              } ${isCompact ? 'p-1' : 'p-2'}`}
              title="Quote"
            >
              <Quote className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
            <button
              onClick={() => handleFormatting('divider')}
              className={`rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out ${
                isCompact ? 'p-1' : 'p-2'
              }`}
              title="Horizontal Rule"
            >
              <Minus className={`transition-all duration-300 ease-in-out ${
                isCompact ? 'w-3 h-3' : 'w-4 h-4'
              }`} />
            </button>
          </div>
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



        {/* Action Buttons */}
        <div className={`flex items-center gap-2 ${!isGmailConnected ? 'ml-auto' : 'ml-auto'}`}>
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
      
      {/* Link Modal */}
      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={handleLinkCancel}
        onConfirm={handleLinkConfirm}
        selectedText={selectedTextForLink}
      />
      
      {/* Code Block Modal */}
      <CodeBlockModal
        isOpen={isCodeBlockModalOpen}
        onClose={handleCodeBlockCancel}
        onConfirm={handleCodeBlockConfirm}
        selectedText={selectedTextForCode}
      />
    </div>
  );
}
