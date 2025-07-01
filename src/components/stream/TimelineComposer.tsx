import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";
import { useActivity } from "@/contexts/ActivityContext";
import { useParams } from "react-router-dom";
import { mockContactsById } from "@/components/stream/sample-data";
import { logger } from '@/utils/logger';

export default function TimelineComposer() {
  const [text, setText] = useState("");
  const { logNoteAdd } = useActivity();
  const { recordId } = useParams();
  
  const handleSend = () => {
    if (text.trim()) {
      logger.log("Comment:", text);
      
      // Log the note to the activity feed
      if (recordId) {
        const contact = mockContactsById[recordId];
        const contactName = contact?.name || recordId.replace('lead-', 'Contact ');
        
        // Log the activity
        logNoteAdd(recordId, contactName, text);
      }
      
      setText("");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && text.trim()) {
      handleSend();
    }
  };

  return (
    <div className="rounded-lg bg-white dark:bg-slate-900 shadow-sm px-4 py-3 flex items-center gap-2">
      <Input
        placeholder="Add a comment (e.g., @John check this out)…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 border-none focus-visible:ring-0"
      />
      <Button
        size="icon"
        variant="ghost"
        disabled={!text.trim()}
        onClick={handleSend}
      >
        <SendHorizontal className="w-4 h-4" />
      </Button>
    </div>
  );
}
