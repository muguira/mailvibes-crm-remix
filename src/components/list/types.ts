
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
