// Sample contact data for use in stream views
export const sampleContact = {
  id: '1',
  name: 'Alberto Navarro',
  title: 'Growth Manager',
  company: 'Acme Corp',
  location: 'Austin, TX',
  email: 'alberto@acmecorp.com',
  phone: '+1 (555) 123-4567',
  owner: 'Sarah Johnson',
  lastContacted: 'Apr 28, 2025',
  leadStatus: 'Qualified',
  lifecycleStage: 'Lead',
  source: 'Website Form',
  industry: 'Software',
  jobTitle: 'Growth Manager',
  address: '123 Tech Lane, Austin, TX 78701',
}

export interface LeadContact {
  id: string
  name: string
  email: string
  opportunity?: string
  title?: string
  company?: string
  location?: string
  phone?: string
  avatarUrl?: string
  owner?: string
  lastContacted?: string
  leadStatus?: string
  lifecycleStage?: string
  source?: string
  industry?: string
  jobTitle?: string
  address?: string
  status?: string
  revenue?: number
  closeDate?: string
  companyName?: string
  employees?: number
  website?: string
  linkedIn?: string
  description?: string
  primaryLocation?: string
  facebook?: string
  instagram?: string
  twitter?: string
  associatedDeals?: string
  data?: Record<string, any>
}

// Export an empty mockContactsById object to store contact data
export const mockContactsById: Record<string, any> = {}
