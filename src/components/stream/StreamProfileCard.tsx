
export default function StreamProfileCard() {
  // dummy contact data
  const contact = {
    avatarUrl: 'https://ui-avatars.com/api/?name=Alberto+N&size=128&background=86BEAE&color=fff',
    name: 'Alberto Navarro',
    title: 'Growth Manager',
    company: 'Acme Corp',
    location: 'Austin, TX'
  };

  return (
    <aside className="bg-white shadow-sm rounded-md p-6 flex flex-col items-center gap-2 w-full">
      <img
        src={contact.avatarUrl}
        alt={contact.name}
        className="h-[96px] w-[96px] rounded-full object-cover border border-muted"
      />
      <h2 className="text-lg font-semibold">{contact.name}</h2>
      <p className="text-sm text-muted-foreground">{contact.title}</p>
      <p className="text-sm text-muted-foreground">{contact.company}</p>
      <p className="text-sm text-muted-foreground">{contact.location}</p>
    </aside>
  );
}
