
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

// Mock contacts mapped by ID for dynamic loading - now maintained by the EditableLeadsGrid
export const mockContactsById: Record<string, any> = {
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
    title: "Marketing Director",
    company: "TechForward",
    location: "Miami, FL",
    email: "marina@techforward.com", 
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
    title: "IT Manager",
    company: "Data Systems Inc.",
    location: "Chicago, IL",
    email: "carlos@datasystems.com",
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
