
import { useState } from "react";
import { MessageSquare, Phone, Calendar, Pencil } from "lucide-react";
import { ContactData } from "../types";
import { PointsOfContactDialog } from "../dialogs/points-of-contact-dialog";
import { logger } from '@/utils/logger';

interface ActivityHeaderProps {
  selectedContact: ContactData;
  listId?: string;
}

export function ActivityHeader({ selectedContact, listId }: ActivityHeaderProps) {
  const [isPointsOfContactOpen, setIsPointsOfContactOpen] = useState(false);
  
  // Extract domain from company name or email
  const getCompanyDomain = () => {
    if (selectedContact.email) {
      const emailParts = selectedContact.email.split('@');
      if (emailParts.length > 1) return emailParts[1];
    }
    
    if (selectedContact.company) {
      // Convert company name to a domain-like string
      return selectedContact.company.toLowerCase().replace(/\s+/g, '') + '.com';
    }
    
    return undefined;
  };
  
  const handleSaveContacts = (contacts: any[]) => {
    // In a real implementation, this would update the contact's associated contacts
    logger.log("Saved contacts:", contacts);
  };

  return (
    <div className="p-3 border-b border-slate-light/30 flex items-center justify-between bg-white">
      <div className="flex items-center">
        <h2 className="font-semibold">{selectedContact.name}</h2>
        {selectedContact.company && (
          <span className="ml-1 text-slate-medium text-sm">
            ({selectedContact.company})
          </span>
        )}
        
        <button 
          className="ml-2 text-slate-medium hover:text-teal-primary"
          onClick={() => setIsPointsOfContactOpen(true)}
        >
          <span className="text-xs underline">
            {selectedContact.points_of_contact?.length || 0} contact(s)
          </span>
        </button>
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
      
      {listId && (
        <PointsOfContactDialog
          isOpen={isPointsOfContactOpen}
          onClose={() => setIsPointsOfContactOpen(false)}
          listId={listId}
          opportunityId={selectedContact.id}
          opportunityName={selectedContact.name}
          companyDomain={getCompanyDomain()}
          onSave={handleSaveContacts}
          initialContacts={selectedContact.points_of_contact || []}
        />
      )}
    </div>
  );
}
