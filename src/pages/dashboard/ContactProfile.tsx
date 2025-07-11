import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { CustomButton } from "@/components/ui/custom-button";
import {  Phone, Mail, MapPin, Linkedin, Building, Briefcase } from "lucide-react";
import { ContactDetails, ContactDetailsDialog } from "@/components/list/dialogs/contact-details-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from '@/utils/logger';
import { triggerContactSync } from "@/workers/emailSyncWorker";
import { useStore } from "@/stores";
import { 
  useContactProfileStore, 
  useContactProfileContact, 
  useContactProfileEditMode, 
  useContactProfileActions,
  useContactProfileInitialization 
} from "@/hooks/useContactProfileStore";

export default function ContactProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use Zustand store hooks
  const { contact, contactDetails, loading, error } = useContactProfileContact();
  const { editMode, setEditMode } = useContactProfileEditMode();
  const { initialize, updateContactDetails, clearError } = useContactProfileActions();
  const { isInitialized, currentContactId } = useContactProfileInitialization();
  
  // Gmail integration
  const { connectedAccounts, authUser } = useStore();
  
  // Get primary field accessors from the store
  const getPrimaryEmail = useContactProfileStore(state => state.contactProfileGetPrimaryEmail);
  const getPrimaryPhone = useContactProfileStore(state => state.contactProfileGetPrimaryPhone);
  const getPrimaryAddress = useContactProfileStore(state => state.contactProfileGetPrimaryAddress);

  useEffect(() => {
    if (!id) return;
    
    // Initialize the contact profile if not already initialized for this contact
    if (!isInitialized || currentContactId !== id) {
      initialize(id).catch((error) => {
        logger.error('Failed to initialize contact profile:', error);
      });
    }
  }, [id, isInitialized, currentContactId, initialize]);

  // Trigger email sync when entering contact profile
  useEffect(() => {
    if (!id || !contact?.email || !authUser?.id || connectedAccounts.length === 0) {
      return;
    }

    // Trigger email sync for this contact to get latest emails
    try {
      triggerContactSync(
        authUser.id,
        connectedAccounts[0].email,
        contact.email
      );
      logger.info(`Triggered email sync for contact: ${contact.email}`);
    } catch (error) {
      logger.error('Failed to trigger email sync:', error);
    }
  }, [id, contact?.email, authUser?.id, connectedAccounts]);

  // Handle saving contact details through the store
  const handleSaveContactDetails = async (contactId: string, details: ContactDetails) => {
    if (!contact) return;
    
    try {
      await updateContactDetails({
        contactId,
        details: {
          firstName: details.firstName,
          lastName: details.lastName,
          emails: details.emails.map(email => ({
            id: email.id,
            value: email.value,
            isPrimary: email.isPrimary,
            type: email.type
          })),
          phones: details.phones.map(phone => ({
            id: phone.id,
            value: phone.value,
            isPrimary: phone.isPrimary,
            type: phone.type
          })),
          addresses: details.addresses.map(address => ({
            id: address.id,
            value: address.value,
            isPrimary: address.isPrimary
          })),
          linkedin: details.linkedin,
          company: details.company,
          title: details.title
        }
      });
      
      // The store will handle closing edit mode and showing success toast
    } catch (error: any) {
      logger.error('Error updating contact:', error);
      // Error handling is done in the store
    }
  };

  return (
    <div className="flex h-screen bg-slate-light/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={contact?.name || "Contact Profile"} />
        
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-6">
                {/* Left column skeleton */}
                <div className="flex-1 space-y-6">
                  {/* Contact Details Section skeleton */}
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    
                    <div className="space-y-4">
                      {/* Email skeleton */}
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      
                      {/* Phone skeleton */}
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      
                      {/* Address skeleton */}
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-64 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Experience Section skeleton */}
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-40 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-36 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right column skeleton */}
                <div className="w-96">
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                </div>
              </div>
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
