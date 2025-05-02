
// Sample contact data for use in stream views
export const sampleContact = {
  id: "1",
  name: "Alberto Navarro",
  title: "Growth Manager",
  company: "Acme Corp",
  location: "Austin, TX",
  email: "alberto@acmecorp.com",
  phone: "+1 (555) 123-4567",
  owner: "Sarah Johnson",
  lastContacted: "Apr 28, 2025",
  leadStatus: "Qualified",
  lifecycleStage: "Lead",
  source: "Website Form",
  industry: "Software",
  jobTitle: "Growth Manager",
  address: "123 Tech Lane, Austin, TX 78701"
};

export interface LeadContact {
  id: string;
  name: string;
  email: string;
  opportunity?: string;
  title?: string;
  company?: string;
  location?: string;
  phone?: string;
  avatarUrl?: string;
  owner?: string;
  lastContacted?: string;
  leadStatus?: string;
  lifecycleStage?: string;
  source?: string;
  industry?: string;
  jobTitle?: string;
  address?: string;
  status?: string;
  revenue?: number;
  closeDate?: string;
  companyName?: string;
  employees?: number;
  website?: string;
  linkedIn?: string;
}

export const generateDummyLeads = (n = 1_000): LeadContact[] =>
  Array.from({ length: n }, (_, i) => {
    const num = (i + 1).toString().padStart(3, '0');
    return {
      id: `lead-${num}`,
      name: `John Doe ${num}`,
      email: `john${num}@example.com`,
      opportunity: `Website Form`,
      status: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'][Math.floor(Math.random() * 5)],
      revenue: Math.floor(Math.random() * 100000),
      closeDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      owner: `John Doe ${num}`.split(' ')[0],
      website: 'https://example.com',
      companyName: `Company ${num}`,
      linkedIn: 'https://linkedin.com/company/example',
      employees: Math.floor(Math.random() * 1000),
      lastContacted: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
  });

// Mock contacts mapped by ID for dynamic loading
export const mockContactsById: Record<string, LeadContact> = {
  "1": {
    id: "1",
    name: "Alberto Navarro",
    title: "Growth Manager",
    company: "Acme Corp",
    location: "Austin, TX",
    email: "alberto@acmecorp.com",
    phone: "+1 (555) 123-4567",
    avatarUrl: 'https://ui-avatars.com/api/?name=Alberto+N&size=128&background=86BEAE&color=fff',
    owner: "Sarah Johnson",
    lastContacted: "Apr 28, 2025",
    leadStatus: "Qualified",
    lifecycleStage: "Lead",
    source: "Website Form",
    industry: "Software",
    jobTitle: "Growth Manager",
    address: "123 Tech Lane, Austin, TX 78701"
  },
  "row-2": {
    id: "row-2",
    name: "Marina Lopez",
    email: "marina@techforward.com",
    title: "Marketing Director",
    company: "TechForward",
    location: "Miami, FL", 
    phone: "+1 (555) 987-6543",
    avatarUrl: 'https://ui-avatars.com/api/?name=Marina+L&size=128&background=6E9DE0&color=fff',
    owner: "Kelly Singsank",
    lastContacted: "Apr 20, 2025",
    leadStatus: "In Progress",
    lifecycleStage: "Opportunity",
    source: "Conference",
    industry: "Marketing",
    jobTitle: "Marketing Director",
    address: "456 Palm Ave, Miami, FL 33101"
  },
  "row-3": {
    id: "row-3",
    name: "Carlos Rodriguez",
    email: "carlos@datasystems.com",
    title: "IT Manager",
    company: "Data Systems Inc.",
    location: "Chicago, IL",
    phone: "+1 (555) 234-5678",
    avatarUrl: 'https://ui-avatars.com/api/?name=Carlos+R&size=128&background=D1A171&color=fff',
    owner: "Rosie Roca",
    lastContacted: "Apr 15, 2025",
    leadStatus: "New",
    lifecycleStage: "Lead",
    source: "Website Demo Request",
    industry: "Information Technology",
    jobTitle: "IT Manager",
    address: "789 Tech Center, Chicago, IL 60601"
  }
};

// Seed mock contacts with dummy leads
generateDummyLeads().forEach(c => {
  if (!mockContactsById[c.id]) {
    mockContactsById[c.id] = c;
  }
});
