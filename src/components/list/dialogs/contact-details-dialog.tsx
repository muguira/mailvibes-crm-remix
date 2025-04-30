
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Star, Trash2, Plus } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export interface ContactField {
  id: string;
  value: string;
  isPrimary: boolean;
  type?: string;
}

export interface ContactDetails {
  firstName: string;
  lastName: string;
  emails: ContactField[];
  phones: ContactField[];
  addresses: ContactField[];
  linkedin: string;
  company: string;
  title: string;
}

interface ContactDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  initialData?: ContactDetails;
  onSave: (contactId: string, data: ContactDetails) => void;
  editMode: "details" | "experience" | null;
}

export function ContactDetailsDialog({
  open,
  onClose,
  contactId,
  initialData,
  onSave,
  editMode
}: ContactDetailsDialogProps) {
  const [details, setDetails] = useState<ContactDetails>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    emails: initialData?.emails || [],
    phones: initialData?.phones || [],
    addresses: initialData?.addresses || [],
    linkedin: initialData?.linkedin || "",
    company: initialData?.company || "",
    title: initialData?.title || ""
  });
  
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const form = useForm({
    defaultValues: {
      ...details
    }
  });

  useEffect(() => {
    if (initialData) {
      setDetails(initialData);
      form.reset(initialData);
    }
  }, [initialData, form]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSave = () => {
    // Ensure at least one email and phone is marked as primary if there are any
    const updatedDetails = { ...details };
    
    if (updatedDetails.emails.length && !updatedDetails.emails.some(e => e.isPrimary)) {
      updatedDetails.emails[0].isPrimary = true;
    }
    
    if (updatedDetails.phones.length && !updatedDetails.phones.some(p => p.isPrimary)) {
      updatedDetails.phones[0].isPrimary = true;
    }
    
    onSave(contactId, updatedDetails);
    toast({
      title: "Contact saved",
      description: "Contact details have been updated successfully"
    });
    onClose();
  };

  const addField = (fieldType: 'emails' | 'phones' | 'addresses') => {
    setDetails({
      ...details,
      [fieldType]: [...details[fieldType], {
        id: crypto.randomUUID(),
        value: '',
        isPrimary: details[fieldType].length === 0, // First one is primary by default
        type: fieldType === 'phones' ? 'mobile' : undefined
      }]
    });
  };

  const removeField = (fieldType: 'emails' | 'phones' | 'addresses', id: string) => {
    const updatedFields = details[fieldType].filter(field => field.id !== id);
    
    // If we removed the primary, make the first one primary
    if (details[fieldType].find(f => f.id === id)?.isPrimary && updatedFields.length > 0) {
      updatedFields[0].isPrimary = true;
    }
    
    setDetails({
      ...details,
      [fieldType]: updatedFields
    });
  };

  const setPrimaryField = (fieldType: 'emails' | 'phones' | 'addresses', id: string) => {
    const updatedFields = details[fieldType].map(field => ({
      ...field,
      isPrimary: field.id === id
    }));
    
    setDetails({
      ...details,
      [fieldType]: updatedFields
    });
  };

  const updateFieldValue = (fieldType: 'emails' | 'phones' | 'addresses', id: string, value: string) => {
    const updatedFields = details[fieldType].map(field => 
      field.id === id ? { ...field, value } : field
    );
    
    setDetails({
      ...details,
      [fieldType]: updatedFields
    });
  };

  const updateFieldType = (fieldType: 'emails' | 'phones' | 'addresses', id: string, type: string) => {
    const updatedFields = details[fieldType].map(field => 
      field.id === id ? { ...field, type } : field
    );
    
    setDetails({
      ...details,
      [fieldType]: updatedFields
    });
  };

  const renderDetailsForm = () => (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      <div className="space-y-1">
        <p className="text-xs text-slate-medium">You have {details.emails.length === 0 ? '1' : '0'} unfinished detail</p>
      </div>
      
      {/* Name fields */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Name</div>
        <div className="flex gap-2">
          <Input
            placeholder="First name"
            value={details.firstName}
            onChange={(e) => setDetails({ ...details, firstName: e.target.value })}
            className="flex-1"
          />
          <Input
            placeholder="Last name"
            value={details.lastName}
            onChange={(e) => setDetails({ ...details, lastName: e.target.value })}
            className="flex-1"
          />
        </div>
        <div>
          <button 
            className="text-xs text-teal-primary hover:underline mt-1"
            onClick={() => setDetails({ ...details, firstName: "", lastName: "" })}
          >
            Add new Name
          </button>
        </div>
      </div>
      
      {/* Email fields */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Email</div>
        {details.emails.map((email) => (
          <div key={email.id} className={`flex gap-2 ${email.isPrimary ? 'border-l-4 border-teal-primary pl-2' : ''}`}>
            <Select 
              value={email.type || 'work'}
              onValueChange={(value) => updateFieldType('emails', email.id, value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={email.value}
              onChange={(e) => updateFieldValue('emails', email.id, e.target.value)}
              className="flex-1"
              placeholder="Email address"
            />
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPrimaryField('emails', email.id)}
                className={email.isPrimary ? 'text-teal-primary' : 'text-slate-medium'}
              >
                <Star className={`h-4 w-4 ${email.isPrimary ? 'fill-teal-primary' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeField('emails', email.id)}
              >
                <Trash2 className="h-4 w-4 text-slate-medium" />
              </Button>
            </div>
          </div>
        ))}
        <div>
          <button 
            className="text-xs text-teal-primary hover:underline mt-1 flex items-center gap-1"
            onClick={() => addField('emails')}
          >
            <Plus className="h-3 w-3" />
            Add new Email
          </button>
        </div>
      </div>
      
      {/* Phone fields */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Phone</div>
        {details.phones.map((phone) => (
          <div key={phone.id} className={`flex gap-2 ${phone.isPrimary ? 'border-l-4 border-teal-primary pl-2' : ''}`}>
            <Select 
              value={phone.type || 'mobile'}
              onValueChange={(value) => updateFieldType('phones', phone.id, value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={phone.value}
              onChange={(e) => updateFieldValue('phones', phone.id, e.target.value)}
              className="flex-1"
              placeholder="Phone number"
            />
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPrimaryField('phones', phone.id)}
                className={phone.isPrimary ? 'text-teal-primary' : 'text-slate-medium'}
              >
                <Star className={`h-4 w-4 ${phone.isPrimary ? 'fill-teal-primary' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeField('phones', phone.id)}
              >
                <Trash2 className="h-4 w-4 text-slate-medium" />
              </Button>
            </div>
          </div>
        ))}
        <div>
          <button 
            className="text-xs text-teal-primary hover:underline mt-1 flex items-center gap-1"
            onClick={() => addField('phones')}
          >
            <Plus className="h-3 w-3" />
            Add new Phone
          </button>
        </div>
      </div>
      
      {/* Address fields */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Address</div>
        {details.addresses.map((address) => (
          <div key={address.id} className={`flex gap-2 ${address.isPrimary ? 'border-l-4 border-teal-primary pl-2' : ''}`}>
            <Input
              value={address.value}
              onChange={(e) => updateFieldValue('addresses', address.id, e.target.value)}
              className="flex-1"
              placeholder="Street address"
            />
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPrimaryField('addresses', address.id)}
                className={address.isPrimary ? 'text-teal-primary' : 'text-slate-medium'}
              >
                <Star className={`h-4 w-4 ${address.isPrimary ? 'fill-teal-primary' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeField('addresses', address.id)}
              >
                <Trash2 className="h-4 w-4 text-slate-medium" />
              </Button>
            </div>
          </div>
        ))}
        <div>
          <button 
            className="text-xs text-teal-primary hover:underline mt-1 flex items-center gap-1"
            onClick={() => addField('addresses')}
          >
            <Plus className="h-3 w-3" />
            Add new Address
          </button>
        </div>
      </div>
      
      {/* LinkedIn URL */}
      <div className="space-y-1">
        <div className="text-sm font-medium">LinkedIn</div>
        <div className="bg-teal-primary/10 p-2 rounded">
          <Input
            value={details.linkedin}
            onChange={(e) => setDetails({ ...details, linkedin: e.target.value })}
            placeholder="LinkedIn URL"
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="text-xs text-slate-medium text-right">New</div>
        </div>
      </div>
      
      {/* Company & Title */}
      <div className="space-y-1">
        <div className="text-sm font-medium">Company</div>
        <Input
          value={details.company}
          onChange={(e) => setDetails({ ...details, company: e.target.value })}
          placeholder="Company"
        />
        <div>
          <button className="text-xs text-teal-primary hover:underline mt-1">Add new Company</button>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="text-sm font-medium">Title</div>
        <Input
          value={details.title}
          onChange={(e) => setDetails({ ...details, title: e.target.value })}
          placeholder="Job Title"
        />
        <div>
          <button className="text-xs text-teal-primary hover:underline mt-1">Add new Title</button>
        </div>
      </div>
    </div>
  );

  const renderExperienceForm = () => (
    <div className="space-y-4 p-2 bg-teal-primary/10 rounded" onKeyDown={handleKeyDown}>
      <div className="space-y-2">
        <div className="text-sm font-medium">Title</div>
        <Input
          value={details.title}
          onChange={(e) => setDetails({ ...details, title: e.target.value })}
          placeholder="Job Title"
          className="border-0 bg-white"
        />
        <div className="text-xs text-slate-medium text-right">New</div>
      </div>
      
      <div className="space-y-2">
        <div className="text-sm font-medium">Company</div>
        <Input
          value={details.company}
          onChange={(e) => setDetails({ ...details, company: e.target.value })}
          placeholder="Search for a company"
          className="border-0 bg-white"
        />
      </div>
      
      <div className="space-y-2">
        <div className="text-sm font-medium">Start Date</div>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          placeholder="Add start date"
          className="border-0 bg-white"
        />
      </div>
      
      <div className="space-y-2">
        <div className="text-sm font-medium">End Date</div>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="Add end date"
          className="border-0 bg-white"
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>
            {editMode === "details" ? "Contact Details" : "Experience"}
            <span className="ml-2 text-xs font-normal text-slate-medium">Editing</span>
          </DialogTitle>
        </DialogHeader>
        
        {editMode === "details" ? renderDetailsForm() : renderExperienceForm()}
        
        <div className="flex justify-end space-x-2 mt-4">
          <CustomButton 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </CustomButton>
          <CustomButton 
            onClick={handleSave}
          >
            Save
          </CustomButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
