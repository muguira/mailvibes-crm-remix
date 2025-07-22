// Common Types

export interface User {
  id: string
  name: string
  email: string
  initials: string
  role: string
}

export interface Task {
  id: string
  title: string
  description?: string
  dueDate: string
  status: 'pending' | 'completed'
  assignee?: string
  contactId?: string
  contactName?: string
}

export interface Comment {
  id: string
  content: string
  author: User
  createdAt: string
  mentions?: string[]
}

export interface ListItem {
  id: string
  name: string
  type: string
  status?: string
  fields: Record<string, any>
  activities: Activity[]
  lastUpdated: string
}

export interface Activity {
  id: string
  type: 'comment' | 'update' | 'call' | 'email' | 'task'
  timestamp: string
  user: {
    id: string
    name: string
    initials: string
  }
  content?: string
  fieldChanges?: {
    field: string
    oldValue: any
    newValue: any
  }[]
}

export interface ListDefinition {
  id: string
  name: string
  icon?: string
  itemType: 'contact' | 'account' | 'opportunity' | 'lead' | 'candidate'
  fields: FieldDefinition[]
}

export interface FieldDefinition {
  id: string
  key: string
  name: string
  type: 'text' | 'number' | 'date' | 'status' | 'email' | 'phone' | 'url'
  required?: boolean
  editable?: boolean
  options?: string[]
}

export interface SavedFilter {
  id: string
  name: string
  criteria: FilterCriterion[]
  createdBy: string
  isShared: boolean
}

export interface FilterCriterion {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'is_empty'
  value: any
}

export interface ReportDefinition {
  id: string
  name: string
  type: 'activity' | 'pipeline' | 'sales'
  dateRange?: {
    start: string
    end: string
  }
  metrics: string[]
  filters?: FilterCriterion[]
}

// Organization Management Types
export * from './organization'
