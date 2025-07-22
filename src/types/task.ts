// Define the Task type with consistent naming
export interface Task {
  id: string
  title: string
  description?: string
  status: 'on-track' | 'at-risk' | 'off-track'
  display_status: 'upcoming' | 'overdue' | 'completed'
  type: 'follow-up' | 'respond' | 'task' | 'cross-functional'
  tag?: string
  deadline?: string
  contact?: string
  priority?: 'low' | 'medium' | 'high'
  dependencies?: string[]
  subtasks?: Task[]
  comments?: { id: string; body: string; author: string }[]
  user_id?: string // Made optional to match TaskData
}

export type TaskData = Task
