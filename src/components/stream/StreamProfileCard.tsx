
interface StreamProfileCardProps {
  contact: {
    name: string;
    title?: string;
    company?: string;
    location?: string;
    avatarUrl?: string;
  };
}

export default function StreamProfileCard({ contact }: StreamProfileCardProps) {
  // Default avatar if not provided
  const avatar = contact.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&size=128&background=86BEAE&color=fff`;
  
  return (
    <aside className="bg-white shadow-sm rounded-md p-6 flex flex-col items-center gap-2 w-full">
      <img
        src={avatar}
        alt={contact.name}
        className="h-[96px] w-[96px] rounded-full object-cover border border-muted"
      />
      <h2 className="text-lg font-semibold">{contact.name}</h2>
      <p className="text-sm text-muted-foreground">{contact.title || 'No title'}</p>
      <p className="text-sm text-muted-foreground">{contact.company || 'No company'}</p>
      <p className="text-sm text-muted-foreground">{contact.location || 'No location'}</p>
    </aside>
  );
}
