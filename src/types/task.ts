
export interface Task {
  id: string;
  title: string;
  deadline?: string;
  contact?: string;
  description?: string;
  displayStatus: "upcoming" | "overdue" | "completed";
  status: "on-track" | "at-risk" | "off-track";
  type: "follow-up" | "respond" | "task" | "cross-functional";
  tag?: string;
  priority?: "low" | "medium" | "high";
  // Additional properties to satisfy existing code references
  dependencies?: string[];
  subtasks?: Task[];
  comments?: { id: string; body: string; author: string }[];
}
