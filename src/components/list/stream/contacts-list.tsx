
import { ContactData } from "../types";

interface ContactsListProps {
  contacts: ContactData[];
  activeContactId: string;
  onContactSelect: (contact: ContactData) => void;
}

export function ContactsList({ contacts, activeContactId, onContactSelect }: ContactsListProps) {
  return (
    <div className="w-72 border-r border-slate-light/30 bg-white overflow-y-auto">
      <div className="p-2 border-b border-slate-light/30 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search Field Values"
          className="px-2 py-1 text-sm border border-slate-light/30 rounded w-full"
        />
      </div>
      
      {contacts.map((contact) => (
        <div
          key={contact.id}
          className={`p-3 border-b border-slate-light/30 cursor-pointer ${
            activeContactId === contact.id ? 'bg-teal-primary/10' : 'hover:bg-slate-light/10'
          }`}
          onClick={() => onContactSelect(contact)}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{contact.name}</div>
              {contact.company && (
                <div className="text-xs text-slate-medium">{contact.company}</div>
              )}
            </div>
            <div className="text-xs text-slate-medium">{contact.lastActivity}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
