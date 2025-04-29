
export type ActivityType = "note" | "update" | "call" | "task-complete";

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

export interface ContactData {
  id: string;
  name: string;
  company?: string;
  lastActivity: string;
  activities: ActivityItem[];
  fields: Record<string, any>;
}
