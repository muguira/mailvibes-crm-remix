import React, { useState, useEffect } from 'react';
import { StreamProfileCard } from './index';
import { AboutThisContact } from './index';
import ActionRow from './ActionRow';
import MobileTabView from './MobileTabView';
import StreamTimeline from './StreamTimeline';
import StreamToolbar from './StreamToolbar';
import FilterPanel from './FilterPanel';
import { EmptyState } from "@/components/ui/empty-state";
import { useActivity } from "@/contexts/ActivityContext";

// Layout constants
const LEFT_RAIL_WIDTH = 400; // px
const RIGHT_RAIL_WIDTH = 300; // px

interface StreamViewLayoutProps {
  contact: {
    id: string;
    name?: string;
    title?: string;
    company?: string;
    location?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    owner?: string;
    lastContacted?: string;
    leadStatus?: string;
    lifecycleStage?: string;
    source?: string;
    industry?: string;
    jobTitle?: string;
    address?: string;
    description?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string; // X platform
    website?: string; // Website field
    associatedDeals?: string;
    primaryLocation?: string;
    data?: Record<string, any>;
    activities?: Array<any>;
  }
}

export default function StreamViewLayout({ contact }: StreamViewLayoutProps) {
  // State to trigger updates on avatar when contact data changes
  const [updatedContact, setUpdatedContact] = useState(contact);
  const { logCellEdit } = useActivity();

  // Listen for mockContactsUpdated event to refresh the UI
  useEffect(() => {
    const handleContactUpdate = (event: CustomEvent) => {
      const { contactId, field, value, oldValue } = event.detail;
      
      if (contactId === contact.id) {
        // Update local state to trigger component re-render
        setUpdatedContact(prevContact => {
          console.log(`StreamViewLayout: Updating field ${field} to: ${value}`);
          return {
            ...prevContact,
            [field]: value
          };
        });
        
        // Log the update to the activity feed
        logCellEdit(
          contactId,
          field,
          value,
          oldValue
        );
        
        console.log(`Profile card updated: ${field} = ${value}`);
      }
    };
    
    // Add specific handler for status changes
    const handleStatusChange = (event: CustomEvent) => {
      const { contactId, status, previousStatus } = event.detail;
      
      if (contactId === contact.id) {
        console.log(`StreamViewLayout: Status change detected: ${previousStatus} -> ${status}`);
        // Force update for status field specifically
        setUpdatedContact(prevContact => ({
          ...prevContact,
          status
        }));
        
        // Log the status change to activity feed
        logCellEdit(
          contactId,
          'status',
          status,
          previousStatus
        );
      }
    };
    
    // Add event listeners with type casting
    window.addEventListener('mockContactsUpdated', 
      ((e: CustomEvent) => handleContactUpdate(e)) as EventListener
    );
    
    window.addEventListener('contactStatusChanged', 
      ((e: CustomEvent) => handleStatusChange(e)) as EventListener
    );
    
    return () => {
      window.removeEventListener('mockContactsUpdated', 
        ((e: CustomEvent) => handleContactUpdate(e)) as EventListener
      );
      
      window.removeEventListener('contactStatusChanged', 
        ((e: CustomEvent) => handleStatusChange(e)) as EventListener
      );
    };
  }, [contact.id, logCellEdit]);

  // Early return if contact is undefined or null
  if (!contact) {
    return (
      <EmptyState 
        title="Contact Not Found" 
        description="No data for this record yet." 
      />
    );
  }

  // Safely destructure contact with default values
  const {
    name = '—',
    title = '—',
    company = '—',
    location = '—',
    phone = '—',
    email = '—',
    status = '—', // Just use status field
    lifecycleStage = '—',
    source = '—',
    industry = '—',
    owner = '—',
    description = '—',
    facebook = '—',
    instagram = '—',
    linkedin = '—',
    twitter = '—',
    website = '—',
    jobTitle = '—',
    associatedDeals = '—',
    primaryLocation = '—',
    activities = [],
    data = {},
  } = { ...contact, ...updatedContact }; // Merge with updatedContact

  // Log the status fields for debugging
  console.log("Stream View status fields:", { 
    contactStatus: contact.status,
    updatedStatus: updatedContact.status,
    finalStatus: status
  });

  // Create a safe contact object with default values - use status consistently
  const safeContact = {
    ...contact,
    ...updatedContact, // Include any updated values
    name,
    title,
    company,
    location,
    phone,
    email,
    status: status !== '—' ? status : '', // Use status consistently
    lifecycleStage,
    source,
    industry,
    owner,
    description,
    facebook,
    instagram,
    linkedin,
    linkedIn: linkedin,
    twitter,
    website,
    jobTitle,
    associatedDeals,
    primaryLocation,
    data,
    activities,
  };

  return (
    <div className="flex flex-col w-full">
      {/* Desktop Toolbar - hidden on mobile */}
      <div className="hidden lg:block">
        <StreamToolbar />
      </div>
      
      <div className="flex flex-col lg:grid lg:grid-cols-[400px_1fr_300px] lg:gap-4 mt-4">
        {/* Left rail - w-full on mobile, fixed 400px width on desktop */}
        <div 
          className="w-full lg:w-[400px] shrink-0 self-start"
          style={{ 
            minWidth: 'auto', 
            maxWidth: '100%',
            // Apply fixed width only on desktop
            ...(typeof window !== 'undefined' && window.innerWidth >= 1024 ? {
              width: LEFT_RAIL_WIDTH,
              minWidth: LEFT_RAIL_WIDTH,
              maxWidth: LEFT_RAIL_WIDTH,
            } : {})
          }}
        >
          {/* Profile card */}
          <StreamProfileCard contact={safeContact} />
          
          {/* Action row - visible on all screen sizes, below profile card */}
          <div className="mt-6 flex items-center justify-center">
            <ActionRow className="w-full" contact={safeContact} />
          </div>
          
          {/* Mobile Tab View - only visible on mobile/tablet */}
          <div className="mt-4">
            <MobileTabView contact={safeContact} />
          </div>
          
          {/* About This Contact - only visible on desktop with single-column layout */}
          <div className="hidden lg:block mt-4">
            <AboutThisContact 
              compact={true} 
              contact={safeContact}
            />
          </div>
        </div>
        
        {/* Main content area - desktop only */}
        <div className="hidden lg:block flex-1 bg-slate-light/5 rounded-md overflow-y-auto self-start h-full">
          <StreamTimeline activities={activities} />
        </div>
        
        {/* Right rail - desktop only */}
        <div 
          className="hidden lg:block self-start"
          style={{
            width: RIGHT_RAIL_WIDTH,
            minWidth: RIGHT_RAIL_WIDTH,
            maxWidth: RIGHT_RAIL_WIDTH,
          }}
        >
          <FilterPanel />
        </div>
      </div>
    </div>
  );
}
