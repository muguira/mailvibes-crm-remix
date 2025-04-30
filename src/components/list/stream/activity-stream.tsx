
import { ActivityHeader } from "./activity-header";
import { ActivityList } from "./activity-list";
import { CommentForm } from "./comment-form";
import { ContactData } from "../types";

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
  listId?: string;
  onAddComment?: (content: string) => void;
}

export function ActivityStream({ selectedContact, activities = [], listId, onAddComment }: ActivityStreamProps) {
  return (
    <div className="flex-1 border-r border-slate-light/30 overflow-hidden flex flex-col">
      <ActivityHeader selectedContact={selectedContact} listId={listId} />
      
      <div className="flex-1 overflow-y-auto bg-slate-light/5">
        <div className="p-4 space-y-4">
          <ActivityList activities={activities} />
          
          {onAddComment && (
            <CommentForm onAddComment={onAddComment} />
          )}
        </div>
      </div>
    </div>
  );
}
