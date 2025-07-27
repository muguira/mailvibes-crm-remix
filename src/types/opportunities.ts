// Type definitions for opportunities
export interface Opportunity {
  id: string
  user_id: string
  organization_id: string // Added organization_id
  opportunity: string
  status: string
  revenue: number
  revenue_display: string
  close_date: string
  owner: string
  website?: string
  company_name: string
  company_linkedin?: string
  employees?: number
  last_contacted?: string
  next_meeting?: string
  lead_source?: string
  priority: 'High' | 'Medium' | 'Low'
  original_contact_id?: string
  converted_at?: string
  data?: any
  created_at: string
  updated_at: string
}

// Filters for opportunities queries
export interface OpportunityFilters {
  stage?: string
  priority?: string
  searchTerm?: string
  dateRange?: { start: string; end: string }
}

// Pagination options for opportunities queries
export interface PaginationOptions {
  page?: number
  pageSize?: number
  sortBy?: 'created_at' | 'revenue' | 'close_date' | 'opportunity'
  sortOrder?: 'asc' | 'desc'
}

// Type for the grid display format (transformed from database)
export interface OpportunityGridRow {
  id: string
  opportunity: string
  status: string
  revenue: string // Formatted display string
  closeDate: string
  owner: string
  website: string
  companyName: string
  companyLinkedin: string
  employees: number
  lastContacted: string
  nextMeeting: string
  leadSource: string
  priority: string
  originalContactId?: string
  convertedAt?: string
  createdAt: string
  updatedAt: string
}

// Pipeline stages with colors (standard CRM stages)
export const PIPELINE_STAGES = [
  { value: 'Lead/New', label: 'Lead/New', color: '#6b7280' },
  { value: 'Qualified', label: 'Qualified', color: '#3b82f6' },
  { value: 'Discovery', label: 'Discovery', color: '#f97316' },
  { value: 'Proposal', label: 'Proposal', color: '#eab308' },
  { value: 'Negotiation', label: 'Negotiation', color: '#8b5cf6' },
  { value: 'Closing', label: 'Closing', color: '#06b6d4' },
  { value: 'Won', label: 'Won', color: '#22c55e' },
  { value: 'Lost', label: 'Lost', color: '#ef4444' },
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['value']
