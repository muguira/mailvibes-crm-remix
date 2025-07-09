import React, { useState } from 'react';
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
  FileText,
  Calendar,
  MoreHorizontal
} from "lucide-react";
import { useParams } from "react-router-dom";
import { mockContactsById } from "@/components/stream/sample-data";
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { useActivities } from '@/hooks/supabase/use-activities';

const ACTIVITY_TYPES = [
  { id: 'call', label: 'Call', icon: Phone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'note', label: 'Note', icon: MessageCircle },
  { id: 'meeting', label: 'Meeting', icon: Calendar },
];

interface TimelineComposerProps {
  contactId?: string;
}

export default function TimelineComposer({ contactId }: TimelineComposerProps) {
  const [text, setText] = useState("");
  const [selectedActivityType, setSelectedActivityType] = useState('note');
  const { recordId } = useParams();
  const effectiveContactId = contactId || recordId;
  const { createActivity } = useActivities(effectiveContactId);
  
  const handleSend = () => {
    if (text.trim() && effectiveContactId) {
      logger.log("Activity:", { type: selectedActivityType, content: text, contactId: effectiveContactId });
      
      // Create activity in Supabase
      createActivity({
        type: selectedActivityType,
        content: text
      });
      
      // Clear the text after sending
      setText("");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFormatting = (format: string) => {
    // TODO: Implement rich text formatting
    logger.log('Formatting:', format);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Activity Type Selector */}
      <div className="flex items-center gap-1 p-3 border-b border-gray-100">
        {ACTIVITY_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedActivityType(type.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                selectedActivityType === type.id
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Text Input Area */}
      <div className="p-4">
        <textarea
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[80px] resize-none border-none focus:outline-none focus:ring-0 text-sm placeholder-gray-500"
        />
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center justify-between p-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleFormatting('bold')}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFormatting('italic')}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFormatting('underline')}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <button
            onClick={() => handleFormatting('bulletList')}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleFormatting('numberedList')}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <button
            onClick={() => handleFormatting('link')}
            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            title="Add Link"
          >
            <Link className="w-4 h-4" />
          </button>
        </div>

        {/* More button */}
        <button
          className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 ml-auto mr-2"
          title="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setText("")}
            disabled={!text.trim()}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!text.trim()}
            onClick={handleSend}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Ok
          </Button>
        </div>
      </div>
    </div>
  );
}
