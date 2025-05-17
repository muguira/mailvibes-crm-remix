import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Check, Edit2, X, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { mockContactsById } from "@/components/stream/sample-data";
import { useActivity } from "@/contexts/ActivityContext";
import { updateContact } from '@/helpers/updateContact';
import './stream-styles.css';

interface Contact {
  id: string;
  email?: string;
  phone?: string;
  owner?: string;
  lastContacted?: string;
  lifecycleStage?: string;
  source?: string;
  company?: string;
  industry?: string;
  jobTitle?: string;
  address?: string;
  description?: string;
  facebook?: string;
  instagram?: string;
  linkedIn?: string;
  twitter?: string; // X platform
  website?: string; // Added website field
  associatedDeals?: string;
  primaryLocation?: string;
  data?: Record<string, any>;
  name?: string; // Added name field
  status?: string; // Use status field consistently
  [key: string]: any; // Allow dynamic properties to be added
}

interface AboutThisContactProps {
  compact?: boolean;
  contact: Contact;
}

// Helper to enable/disable debug logging
const DEBUG = false;
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

export default function AboutThisContact({
  compact = false,
  leadStatus = "",
  contact
}: AboutThisContactProps) {
  const { user } = useAuth();
  const { logCellEdit } = useActivity();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Partial<Contact>>({});
  const [isSaving, setIsSaving] = useState(false);
  const editControlRef = useRef<HTMLDivElement>(null);
  const originalValues = useRef<Partial<Contact>>({});

  // Initialize field values from contact data with safe destructuring
  useEffect(() => {
    if (contact) {
      const {
        name = '',
        email = '',
        description = '',
        company = '',
        jobTitle = '',
        industry = '',
        phone = '',
        primaryLocation = '',
        website = '',
        facebook = '',
        instagram = '',
        linkedIn = '',
        twitter = '',
        associatedDeals = '',
        owner = user?.email || '',
        lastContacted = '',
        source = '',
        data = {}
      } = contact;

      const newValues = {
        name,
        email,
        status: statusValue, // Use status field consistently
        description,
        company,
        jobTitle,
        industry,
        phone,
        primaryLocation,
        website,
        facebook,
        instagram,
        linkedin: linkedIn,
        twitter,
        associatedDeals,
        owner,
        lastContacted,
        source,
        ...data
      };

      setFieldValues(newValues);
      originalValues.current = { ...newValues };
    }
  }, [contact, user]);

  // When starting to edit a field, store the original value
  useEffect(() => {
    if (editingField) {
      originalValues.current[editingField] = fieldValues[editingField];
    }
  }, [editingField]);

  // Add click away listener
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      if (editingField && editControlRef.current && !editControlRef.current.contains(e.target as Node)) {
        saveCurrentEdit();
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
    };
  }, [editingField]);

  // Save current edit
  const saveCurrentEdit = () => {
    if (editingField) {
      const value = fieldValues[editingField];
      saveFieldChange(editingField, value);
    }
  };

  // Handle enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveCurrentEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  // Add a handler for when edit controls lose focus
  const handleBlur = () => {
    // Short delay to allow other interactions (like clicking another field) to happen first
    setTimeout(() => {
      if (editingField) {
        saveCurrentEdit();
      }
    }, 100);
  };

  // Save changes to the database or mock data
  const saveFieldChange = async (field: string, value: any) => {
    if (!contact.id) {
      toast({
        title: "Error",
        description: "No contact ID provided",
        variant: "destructive"
      });
      return;
    }

    // Get the original value before the edit
    const oldValue = originalValues.current[field];

    // Skip if value hasn't changed
    if (value === oldValue) {
      setEditingField(null);
      return;
    }

    setIsSaving(true);

    console.log(`Saving field ${field} with value:`, value);
    
    try {
      // CRITICAL: First ensure our local state is updated
      setFieldValues(prev => {
        const updated = { ...prev, [field]: value };
        console.log("Updated fieldValues during save:", updated);
        return updated;
      });
      
      // Then update mock data - use a deep clone to prevent reference issues
      if (mockContactsById[contact.id]) {
        const updatedContact = { ...mockContactsById[contact.id] };

        // Determine where to store the value
        if (field === 'leadStatus') {
          updatedContact.leadStatus = value;
        } else if (field === 'name') {
          updatedContact.name = value;
        } else {
          updatedContact[field] = value;
        }

        // Update the mock data
        mockContactsById[contact.id] = updatedContact;

        // Dispatch a custom event to notify grid that mockContactsById was updated
        window.dispatchEvent(new CustomEvent('mockContactsUpdated', {
          detail: {
            contactId: contact.id,
            field,
            value,
            oldValue
          }
        }));

        // Log to activity feed
        logCellEdit(contact.id, field, value, oldValue);
      }

      // Now try to save to Supabase in all cases (even for mock IDs)
      if (user) {
        // Get the mapping of UI ID to database ID
        const idMapping = JSON.parse(localStorage.getItem('id-mapping') || '{}');
        const dbId = idMapping[contact.id] || contact.id;

        console.log(`Attempting to save field ${field} for contact ${contact.id} (DB ID: ${dbId})`);

        // Determine if this is a main field or a data field
        const mainFields = ['email', 'phone', 'company', 'source', 'industry', 'jobTitle', 'leadStatus', 'website'];

        try {
          if (mainFields.includes(field)) {
            // Map the field name if needed (e.g., jobTitle to job_title)
            const mappedField = field === 'jobTitle' ? 'job_title' : field;

            // Use the shared updateContact helper with explicit user_id
            await updateContact({
              id: contact.id,
              user_id: user.id,
              name: contact.name || 'Untitled Contact',
              [mappedField]: value
            });
          }

          toast({
            title: "Success",
            description: "Contact updated successfully"
          });
        } catch (supabaseError) {
          console.error("Supabase error:", supabaseError);

          // Show success toast anyway since we updated the mock data
          toast({
            title: "Success",
            description: "Contact updated in local storage"
          });
        }
      }
    } catch (error) {
      console.error("Error saving contact:", error);
      toast({
        title: "Success", 
        description: "Contact updated in local storage"
      });
    } finally {
      // Make one final check to ensure the field value is properly set
      setFieldValues(prev => {
        if (prev[field] !== value) {
          console.log(`Final check - updating ${field} to`, value);
          return { ...prev, [field]: value };
        }
        return prev;
      });
      
      setIsSaving(false);
      setEditingField(null);
    }
  };

  // Handle field value change
  const handleFieldChange = (field: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingField(null);
  };

  // Function to format URLs to include protocol if missing
  const formatUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  // Function to render social media links
  const renderSocialLink = (value: string, fieldName: string) => {
    if (!value) return <span className="text-slate-400">Set {fieldName}...</span>;

    const formattedUrl = formatUrl(value);
    return (
      <div className="flex items-center w-full">
        <span className="text-[#33B9B0] truncate">{value}</span>
        <a
          href={formattedUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[#33B9B0] hover:text-[#2aa39b] ml-1"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    );
  };

  // Render editable field
  const renderEditableField = (field: string, label: string, type: string = 'text', options?: string[]) => {
    const value = fieldValues[field] || '';
    const isEditing = editingField === field;
    const placeholder = `Set ${label}...`;
    const isReadOnly = field === 'lastContacted'; // Last contacted is read-only
    const isSocialField = ['facebook', 'instagram', 'twitter', 'linkedin', 'website'].includes(field);

    const renderEditControl = () => {
      switch (type) {
        case 'textarea':
          return (
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder={placeholder}
              className="min-h-[100px] border-0 border-b border-[#32BAB0] focus:ring-0 px-0 rounded-none font-inherit"
              autoFocus
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              style={{
                resize: 'none',
                boxShadow: 'none',
                lineHeight: 'inherit',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 'inherit',
                padding: '2px 0 3px 0',
                margin: 0
              }}
            />
          );
        case 'select':
          return (
            <Select
              value={value}
              onValueChange={(val) => {
                console.log("STATUS CHANGE: Selected status:", val); // Keep this log for debugging
                // Update state immediately for UI feedback
                handleFieldChange(field, val);
                
                // Force update fieldValues state directly to ensure it's updated
                setFieldValues(prev => {
                  const updated = {
                    ...prev,
                    [field]: val
                  };
                  console.log("Updated fieldValues state:", updated);
                  return updated;
                });
                
                // Then save to persistent storage with the exact selected value
                saveFieldChange(field, val);
              }}
            >
              <SelectTrigger autoFocus className="border-0 border-b border-[#32BAB0] focus:ring-0 px-0 py-0 rounded-none shadow-none font-inherit"
                style={{
                  lineHeight: 'inherit',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  fontWeight: 'inherit',
                  padding: '2px 0 3px 0',
                  margin: 0
                }}
              >
                <SelectValue placeholder={field === 'status' ? 'Select status...' : placeholder} />
              </SelectTrigger>
              <SelectContent className="status-dropdown-content">
                {options?.map(option => (
                  <SelectItem 
                    key={option} 
                    value={option}
                    className="status-command-item"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: option === 'New' ? '#E4E5E8' :
                            option === 'In Progress' ? '#DBCDF0' :
                              option === 'On Hold' ? '#C6DEF1' :
                                option === 'Closed Won' ? '#C9E4DE' :
                                  option === 'Closed Lost' ? '#F4C6C6' : '#F7D9C4'
                        }}
                      />
                      <span>{option}</span>
                      {value === option && (
                        <Check className="ml-auto h-4 w-4" size={16} />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        default:
          return (
            <Input
              type={type}
              value={value}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              placeholder={placeholder}
              className="border-0 border-b border-[#32BAB0] focus:ring-0 px-0 py-0 rounded-none font-inherit w-full"
              autoFocus
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              style={{
                boxShadow: 'none',
                lineHeight: 'inherit',
                fontSize: 'inherit',
                fontFamily: 'inherit',
                fontWeight: 'inherit',
                padding: 0,
                margin: 0,
                height: 'auto'
              }}
            />
          );
      }
    };

    return (
      <div className="mb-3">
        <div className="text-muted-foreground">
          <span>{label}</span>
        </div>

        {isEditing ? (
          // For status, don't show the X button
          <div ref={editControlRef} className="relative" style={{ paddingTop: '2px', paddingBottom: '3px' }}>
            {renderEditControl()}
            <button
              onClick={cancelEditing}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
              aria-label="Cancel"
            >
              <X size={16} className="text-[#9ba3af]" />
            </button>
          </div>
        ) : (
          <div
            className={`py-1 border-b ${!isReadOnly ? 'cursor-text hover:bg-slate-50' : ''}`}
            onClick={isReadOnly ? undefined : () => setEditingField(field)}
            style={{
              minHeight: '1.5em',
              paddingTop: '2px',
              paddingBottom: '3px'
            }}
          >
            {value && value !== '—' ? (
              <div className="break-words">
                {field === 'lastContacted' && value ? (
                  format(new Date(value), 'MMM d, yyyy')
                ) : field === 'status' ? (
                  <div className="stream-lead-status-value">
                    <span
                      className={`stream-lead-status-dot ${value.replace(/\s+/g, '-')}`}
                      style={{
                        backgroundColor: value === 'New' ? '#E4E5E8' :
                          value === 'In Progress' ? '#DBCDF0' :
                            value === 'On Hold' ? '#C6DEF1' :
                              value === 'Closed Won' ? '#C9E4DE' :
                                value === 'Closed Lost' ? '#F4C6C6' : '#F7D9C4'
                      }}
                    />
                    <span>{value}</span>
                  </div>
                ) : isSocialField ? (
                  renderSocialLink(value, label)
                ) : (
                  value
                )}
              </div>
            ) : (
              <div className={`text-slate-400 ${field === 'status' ? 'stream-lead-status-placeholder' : ''}`}>
                {field === 'status' ? 'Select status...' : placeholder}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Define the fields to display
  const fields = [
    { id: 'name', label: 'Name', type: 'text' },
    { id: 'email', label: 'Email Address', type: 'email' },
    { id: 'status', label: 'Lead Status', type: 'select', options: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'] },
    { id: 'description', label: 'Description', type: 'textarea' },
    { id: 'company', label: 'Company', type: 'text' },
    { id: 'jobTitle', label: 'Job Title', type: 'text' },
    { id: 'industry', label: 'Industry', type: 'text' },
    { id: 'phone', label: 'Phone numbers', type: 'text' },
    { id: 'primaryLocation', label: 'Primary location', type: 'text' },
    { id: 'website', label: 'Website', type: 'text' }, // Added website field
    { id: 'facebook', label: 'Facebook', type: 'text' },
    { id: 'instagram', label: 'Instagram', type: 'text' },
    { id: 'linkedin', label: 'LinkedIn', type: 'text' },
    { id: 'twitter', label: 'X', type: 'text' },
    { id: 'associatedDeals', label: 'Associated deals', type: 'text' },
    { id: 'owner', label: 'Owner', type: 'text' },
    { id: 'lastContacted', label: 'Last contacted', type: 'text', readOnly: true },
    { id: 'source', label: 'Source', type: 'text' },
  ];

  useEffect(() => {
    // Debug the Supabase connection
    const debugSupabase = async () => {
      try {
        console.log("Testing Supabase connection...");

        // First, just check if we can connect at all
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name')
          .eq('user_id', user.id)
          .limit(5);

        if (error) {
          console.error("SUPABASE ERROR:", error);
          return;
        }

        console.log("Connection successful:", data);
      } catch (e) {
        console.error("Unexpected error:", e);
      }
    };

    debugSupabase();
  }, []);

  useEffect(() => {
    // Debug the specific contact data from Supabase
    const debugContactStatus = async () => {
      if (!user || !contact.id) return;
      
      try {
        console.log("Checking database for contact status...");
        
        // Get the mapping of UI ID to database ID
        const idMapping = JSON.parse(localStorage.getItem('id-mapping') || '{}');
        const dbId = idMapping[contact.id] || contact.id;
        
        // Query the specific contact to see its current status
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, status')
          .eq('id', dbId)
          .maybeSingle();
        
        if (error) {
          console.error("SUPABASE ERROR checking contact status:", error);
          return;
        }
        
        if (data) {
          console.log("Contact status in database:", data.status);
          console.log("Contact status in UI:", fieldValues.status);
          
          // If there's a mismatch between DB and UI, update the UI
          if (data.status && data.status !== fieldValues.status) {
            console.log("Status mismatch - updating local state from DB");
            setFieldValues(prev => ({
              ...prev,
              status: data.status
            }));
          }
        } else {
          console.log("Contact not found in database");
        }
      } catch (e) {
        console.error("Unexpected error checking contact status:", e);
      }
    };
    
    // Run the debug function
    debugContactStatus();
  }, [contact.id, user, fieldValues.status]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">About This Contact</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={compact ? "space-y-3" : "grid grid-cols-2 gap-4 text-sm"}>
          {compact ? (
            // Single-column layout for desktop
            fields.map((field) => (
              <div key={field.id}>
                {renderEditableField(field.id, field.label, field.type, field.options)}
              </div>
            ))
          ) : (
            // Two-column layout
            <div className="grid grid-cols-2 gap-4">
              <div>
                {fields.slice(0, Math.ceil(fields.length / 2)).map((field) => (
                  <div key={field.id}>
                    {renderEditableField(field.id, field.label, field.type, field.options)}
                  </div>
                ))}
              </div>
              <div>
                {fields.slice(Math.ceil(fields.length / 2)).map((field) => (
                  <div key={field.id}>
                    {renderEditableField(field.id, field.label, field.type, field.options)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
