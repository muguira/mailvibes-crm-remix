
import { MessageSquare, Phone, Calendar } from "lucide-react";
import { ContactData } from "../types";

interface ActivityHeaderProps {
  selectedContact: ContactData;
}

export function ActivityHeader({ selectedContact }: ActivityHeaderProps) {
  return (
    <div className="p-3 border-b border-slate-light/30 flex items-center justify-between bg-white">
      <div className="flex items-center">
        <h2 className="font-semibold">{selectedContact.name}</h2>
        {selectedContact.company && (
          <span className="ml-1 text-slate-medium text-sm">
            ({selectedContact.company})
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1">
        <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
          <MessageSquare size={16} />
        </button>
        <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
          <Phone size={16} />
        </button>
        <button className="p-1.5 rounded hover:bg-slate-light/20 text-slate-medium">
          <Calendar size={16} />
        </button>
      </div>
    </div>
  );
}
