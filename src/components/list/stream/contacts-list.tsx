import { ContactData } from "../types";
import { EmptyState } from "@/components/ui/empty-state";

export function ContactsList({
  contacts,
  selectedContactId,
  onContactSelect,
  onCreateContact
}: {
  contacts: ContactData[];
  selectedContactId: string | null;
  onContactSelect: (contact: ContactData) => void;
  onCreateContact: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto h-full">
      {contacts.length === 0 ? (
        <EmptyState 
          title="No contacts found"
          description="Get started by creating a new contact"
          actionLabel="Create Contact"
          onAction={onCreateContact}
        />
      ) : (
        <div className="divide-y divide-slate-light/20">
          {contacts.map(contact => (
            <div 
              key={contact.id}
              className={`p-3 hover:bg-slate-light/10 cursor-pointer ${
                contact.id === selectedContactId ? 'bg-teal-primary/10' : ''
              }`}
              onClick={() => onContactSelect(contact)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    <a 
                      href={`/contact/${contact.id}`} 
                      className="text-teal-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {contact.name || 'Unnamed Contact'}
                    </a>
                  </div>
                  {contact.company && (
                    <div className="text-sm text-slate-medium">{contact.company}</div>
                  )}
                </div>
                <div className="text-xs text-slate-medium">{contact.lastActivity}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
