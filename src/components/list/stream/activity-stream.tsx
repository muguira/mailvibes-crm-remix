
import { useState } from "react";
import { MessageSquare, Phone, Calendar } from "lucide-react";
import { ActivityItem } from "./activity-item";
import { Avatar } from "@/components/shared/avatar";
import { CustomButton } from "@/components/ui/custom-button";
import { ContactData } from "../types";
import { useAuth } from "@/contexts/AuthContext";

interface ActivityStreamProps {
  selectedContact: ContactData;
  activities?: {
    id: string;
    type: "note" | "update" | "call" | "task-complete";
    timestamp: string;
    content: string;
    user: {
      name: string;
      initials: string;
    };
    field?: {
      name: string;
      value: string;
    };
  }[];
  onAddComment?: (content: string) => void;
}

export function ActivityStream({ selectedContact, activities = [], onAddComment }: ActivityStreamProps) {
  const [commentText, setCommentText] = useState("");
  const { user } = useAuth();
  
  const handlePostComment = () => {
    if (!commentText.trim() || !onAddComment) return;
    
    onAddComment(commentText);
    setCommentText("");
  };
  
  const userInitials = user?.email 
    ? user.email.substring(0, 2).toUpperCase() 
    : "US";

  return (
    <div className="flex-1 border-r border-slate-light/30 overflow-hidden flex flex-col">
      <div className="p-3 border-b border-slate-light/30 flex items-center justify-between bg-white">
        <div className="flex items-center">
          <h2 className="font-semibold">{selectedContact.name}</h2>
          {selectedContact.company && (
            <span className="ml-1 text-slate-medium text-sm">
              ({selectedContact.company})
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
            <MessageSquare size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
            <Phone size={16} />
          </button>
          <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
            <Calendar size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 bg-slate-light/5">
        <div className="p-4 space-y-4">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
          
          <div className="bg-white p-4 shadow-sm rounded-md">
            <div className="flex gap-3">
              <Avatar name={user?.email?.split('@')[0] || "You"} initials={userInitials} />
              <div className="flex-1">
                <textarea 
                  placeholder="Add a comment or @mention a teammate..."
                  className="w-full p-2 border border-slate-light/30 rounded text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-teal-primary/30 focus:border-teal-primary"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="flex justify-end mt-2">
                  <CustomButton 
                    size="sm"
                    onClick={handlePostComment}
                    disabled={!commentText.trim()}
                  >
                    Post Comment
                  </CustomButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
