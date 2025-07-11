export interface AccountProperty {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'collaborator' | 'list';
  required?: boolean;
  options?: string[]; // For list type properties
  defaultValue?: any;
  created_at?: string;
  updated_at?: string;
}

export interface NewAccountProperty {
  name: string;
  type: 'text' | 'number' | 'date' | 'collaborator' | 'list';
  options?: string[];
  required?: boolean;
  defaultValue?: any;
}

export const DEFAULT_ACCOUNT_PROPERTIES: AccountProperty[] = [
  { id: 'name', name: 'Name', type: 'text', required: true },
  { id: 'email', name: 'Email Address', type: 'text' },
  { id: 'status', name: 'Lead Status', type: 'list', options: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'] },
  { id: 'description', name: 'Description', type: 'text' },
  { id: 'company', name: 'Company', type: 'text' },
  { id: 'jobTitle', name: 'Job Title', type: 'text' },
  { id: 'industry', name: 'Industry', type: 'text' },
  { id: 'phone', name: 'Phone Numbers', type: 'text' },
  { id: 'primaryLocation', name: 'Primary Location', type: 'text' },
  { id: 'website', name: 'Website', type: 'text' },
  { id: 'facebook', name: 'Facebook', type: 'text' },
  { id: 'instagram', name: 'Instagram', type: 'text' },
  { id: 'linkedin', name: 'LinkedIn', type: 'text' },
  { id: 'twitter', name: 'X', type: 'text' },
  { id: 'associatedDeals', name: 'Associated Deal', type: 'text' },
  { id: 'owner', name: 'Owner', type: 'collaborator' },
  { id: 'lastContacted', name: 'Last Contacted', type: 'date' },
  { id: 'source', name: 'Source', type: 'text' }
];

export const PROPERTY_TYPE_OPTIONS = [
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' }
]; 