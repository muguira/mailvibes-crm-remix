import { ExternalLink } from "lucide-react";

interface StreamProfileCardProps {
  contact: {
    id?: string;
    name: string;
    title?: string;
    company?: string;
    location?: string;
    avatarUrl?: string;
    email?: string;
    jobTitle?: string;
    linkedin?: string;
    linkedIn?: string;
  };
}

export default function StreamProfileCard({ contact }: StreamProfileCardProps) {
  // Default avatar if not provided
  const avatar = contact.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&size=128&background=86BEAE&color=fff`;
  
  // Format LinkedIn URL - handle both property versions
  const formatLinkedInUrl = (url?: string): string => {
    if (!url || url === '—') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };
  
  // Support both camelCase and lowercase property names
  const linkedInValue = contact.linkedIn || contact.linkedin;
  const linkedInUrl = formatLinkedInUrl(linkedInValue);
  
  return (
    <aside className="bg-white shadow-sm rounded-md p-6 flex flex-col items-center gap-2 w-full">
      <img
        src={avatar}
        alt={contact.name}
        className="h-[96px] w-[96px] rounded-full object-cover border border-muted"
      />
      <h2 className="text-lg font-semibold">{contact.name}</h2>
      
      {/* Email (after name) */}
      {contact.email && contact.email !== '—' && (
        <p className="text-sm text-muted-foreground">{contact.email}</p>
      )}
      
      {/* Company (after email) */}
      {contact.company && contact.company !== '—' && (
        <p className="text-sm text-muted-foreground">{contact.company}</p>
      )}
      
      {/* Job Title (after company) */}
      {contact.jobTitle && contact.jobTitle !== '—' && (
        <p className="text-sm text-muted-foreground">{contact.jobTitle}</p>
      )}
      
      {/* LinkedIn (if available) */}
      {linkedInValue && linkedInValue !== '—' && linkedInUrl && (
        <a 
          href={linkedInUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm text-[#33B9B0] hover:underline"
        >
          LinkedIn
        </a>
      )}
      
      {/* Location (last) */}
      {contact.location && contact.location !== '—' && (
        <p className="text-sm text-muted-foreground">{contact.location}</p>
      )}
    </aside>
  );
}
