
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CustomButton } from "@/components/ui/custom-button";

interface CreateContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newContact: {
    name: string;
    company: string;
    email: string;
    phone: string;
  };
  onContactChange: (contact: {
    name: string;
    company: string;
    email: string;
    phone: string;
  }) => void;
  onCreateContact: () => void;
}

export function CreateContactDialog({
  isOpen,
  onClose,
  newContact,
  onContactChange,
  onCreateContact
}: CreateContactDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Contact</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-dark">
                Name *
              </label>
              <input
                id="name"
                type="text" 
                value={newContact.name}
                onChange={(e) => onContactChange({...newContact, name: e.target.value})}
                className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                placeholder="Enter contact name"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-medium text-slate-dark">
                Company
              </label>
              <input
                id="company"
                type="text" 
                value={newContact.company}
                onChange={(e) => onContactChange({...newContact, company: e.target.value})}
                className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-dark">
                Email
              </label>
              <input
                id="email"
                type="email" 
                value={newContact.email}
                onChange={(e) => onContactChange({...newContact, email: e.target.value})}
                className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                placeholder="Enter email address"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-slate-dark">
                Phone
              </label>
              <input
                id="phone"
                type="text" 
                value={newContact.phone}
                onChange={(e) => onContactChange({...newContact, phone: e.target.value})}
                className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                placeholder="Enter phone number"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <CustomButton
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </CustomButton>
          <CustomButton 
            onClick={onCreateContact}
            disabled={!newContact.name.trim()}
          >
            Create Contact
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
