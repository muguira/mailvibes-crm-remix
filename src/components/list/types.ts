
// Append to the existing types.ts file
import { PresenceUser, ChangeRecord } from "@/hooks/supabase";

export interface ListHeaderProps {
  listsLoading: boolean;
  lists: any[];
  currentListId: string | null;
  presentUsers: Record<string, PresenceUser>;
  viewMode: "grid" | "stream";
  setCurrentListId: (id: string) => void;
  setIsCreateListOpen: (isOpen: boolean) => void;
  setIsHistoryOpen: (isOpen: boolean) => void;
  setViewMode: (mode: "grid" | "stream") => void;
}

export interface ListsPageProps {
  // Add any props needed for the Lists page component
}

// Add missing ContactData type
export interface ContactData {
  id: string;
  name: string;
  company?: string;
  lastActivity?: string;
  activities?: ActivityItem[];
  fields?: Record<string, any>;
}

// Add missing ActivityItem type
export interface ActivityItem {
  id: string;
  type: ActivityType;
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
}

// Add missing ActivityType enum
export type ActivityType = "note" | "update" | "call" | "task-complete" | "email";
