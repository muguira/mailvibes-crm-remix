
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { CustomButton } from "@/components/ui/custom-button";
import { Edit, Phone, Mail, MapPin, Linkedin, Building, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ContactDetails, ContactDetailsDialog } from "@/components/list/dialogs/contact-details-dialog";
import { Contact } from "@/hooks/supabase/use-contacts";

export default function ContactProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [editMode, setEditMode] = useState<"details" | "experience" | null>(null);
  
  // Convert contact data to the format needed by the dialog
  const [contactDetails, setContactDetails] = useState<ContactDetails>({
    firstName: "",
    lastName: "",
    emails: [],
    phones: [],
    addresses: [],
    linkedin: "",
    company: "",
    title: ""
  });

  useEffect(() => {
    if (!id) return;
    
    const fetchContact = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setContact(data);
          
          // Parse contact data into the detailed format
          const contactData = data.data || {};
          const nameParts = data.name ? data.name.split(' ') : ['', ''];
          
          setContactDetails({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            emails: contactData.emails ? contactData.emails.map((email: any) => ({
              id: email.id || crypto.randomUUID(),
              value: email.value,
              isPrimary: email.isPrimary || false,
              type: email.type || 'work'
            })) : [],
            phones: contactData.phones ? contactData.phones.map((phone: any) => ({
              id: phone.id || crypto.randomUUID(),
              value: phone.value,
              isPrimary: phone.isPrimary || false,
              type: phone.type || 'mobile'
            })) : [],
            addresses: contactData.addresses ? contactData.addresses.map((address: any) => ({
              id: address.id || crypto.randomUUID(),
              value: address.value,
              isPrimary: address.isPrimary || false
            })) : [],
            linkedin: contactData.linkedin || '',
            company: data.company || contactData.company || '',
            title: contactData.title || ''
          });
        }
      } catch (error: any) {
        console.error('Error fetching contact:', error);
        toast({
          title: "Error",
          description: "Failed to load contact data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchContact();
  }, [id]);

  const handleSaveContactDetails = async (contactId: string, details: ContactDetails) => {
    if (!contact) return;
    
    try {
      // Create the full name from first and last names
      const fullName = `${details.firstName} ${details.lastName}`.trim();
      
      // Prepare contact data for saving
      const updatedContactData = {
        ...contact.data,
        emails: details.emails,
        phones: details.phones,
        addresses: details.addresses,
        linkedin: details.linkedin,
        title: details.title
      };
      
      // Update the contact in the database
      const { error } = await supabase
        .from('contacts')
        .update({
          name: fullName,
          company: details.company,
          email: details.emails.find(e => e.isPrimary)?.value || null,
          phone: details.phones.find(p => p.isPrimary)?.value || null,
          data: updatedContactData,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);
        
      if (error) throw error;
      
      // Update local state
      setContact({
        ...contact,
        name: fullName,
        company: details.company,
        email: details.emails.find(e => e.isPrimary)?.value || null,
        phone: details.phones.find(p => p.isPrimary)?.value || null,
        data: updatedContactData
      });
      
      // Close dialog and show success toast
      setEditMode(null);
      toast({
        title: "Contact saved",
        description: "Contact details have been updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: `Failed to update contact: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getPrimaryEmail = () => {
    const primaryEmail = contactDetails.emails.find(e => e.isPrimary);
    return primaryEmail ? primaryEmail.value : (contactDetails.emails[0]?.value || contact?.email || '');
  };

  const getPrimaryPhone = () => {
    const primaryPhone = contactDetails.phones.find(p => p.isPrimary);
    return primaryPhone ? primaryPhone.value : (contactDetails.phones[0]?.value || contact?.phone || '');
  };

  const getPrimaryAddress = () => {
    const primaryAddress = contactDetails.addresses.find(a => a.isPrimary);
    return primaryAddress ? primaryAddress.value : contactDetails.addresses[0]?.value || '';
  };

  return (
    <div className="flex h-screen bg-slate-light/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={contact?.name || "Contact Profile"} />
        
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-medium">Loading contact information...</div>
            </div>
          ) : !contact ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-slate-medium mb-4">Contact not found</div>
              <CustomButton onClick={() => navigate('/lists')}>
                Back to Lists
              </CustomButton>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-6">
                {/* Left column - Contact info */}
                <div className="flex-1 space-y-6">
                  {/* Contact Details Section */}
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-navy-deep">Contact Details</h2>
                      <button 
                        className="text-teal-primary hover:underline text-sm"
                        onClick={() => setEditMode("details")}
                      >
                        Edit
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                          <Mail size={16} className="text-teal-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{getPrimaryEmail()}</div>
                          <div className="text-xs text-slate-medium">Primary Email</div>
                          {contactDetails.emails.length > 1 && (
                            <div className="text-xs text-teal-primary mt-1">
                              +{contactDetails.emails.length - 1} more
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {getPrimaryPhone() && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                            <Phone size={16} className="text-teal-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{getPrimaryPhone()}</div>
                            <div className="text-xs text-slate-medium">Primary Phone</div>
                            {contactDetails.phones.length > 1 && (
                              <div className="text-xs text-teal-primary mt-1">
                                +{contactDetails.phones.length - 1} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {getPrimaryAddress() && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                            <MapPin size={16} className="text-teal-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{getPrimaryAddress()}</div>
                            <div className="text-xs text-slate-medium">Primary Address</div>
                            {contactDetails.addresses.length > 1 && (
                              <div className="text-xs text-teal-primary mt-1">
                                +{contactDetails.addresses.length - 1} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {contactDetails.linkedin && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                            <Linkedin size={16} className="text-teal-primary" />
                          </div>
                          <div>
                            <a 
                              href={contactDetails.linkedin.startsWith('http') ? contactDetails.linkedin : `https://${contactDetails.linkedin}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-medium text-teal-primary hover:underline"
                            >
                              {contactDetails.linkedin}
                            </a>
                            <div className="text-xs text-slate-medium">LinkedIn Profile</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Experience Section */}
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-navy-deep">Experience</h2>
                      <button 
                        className="text-teal-primary hover:underline text-sm"
                        onClick={() => setEditMode("experience")}
                      >
                        Edit
                      </button>
                    </div>
                    
                    {(contactDetails.company || contactDetails.title) ? (
                      <div className="space-y-4">
                        {contactDetails.title && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                              <Briefcase size={16} className="text-teal-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{contactDetails.title}</div>
                              <div className="text-xs text-slate-medium">Current Title</div>
                            </div>
                          </div>
                        )}
                        
                        {contactDetails.company && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-primary/20 flex items-center justify-center mt-1">
                              <Building size={16} className="text-teal-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{contactDetails.company}</div>
                              <div className="text-xs text-slate-medium">Current Company</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-medium text-center py-4">
                        No experience information added yet
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Right column - Activity and Interactions */}
                <div className="w-96">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h2 className="text-lg font-semibold text-navy-deep mb-4">Recent Activity</h2>
                    <div className="text-slate-medium text-center py-8">
                      No recent activity with this contact
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ContactDetailsDialog
        open={editMode !== null}
        onClose={() => setEditMode(null)}
        contactId={id || ''}
        initialData={contactDetails}
        onSave={handleSaveContactDetails}
        editMode={editMode}
      />
    </div>
  );
}
