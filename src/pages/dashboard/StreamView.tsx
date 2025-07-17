import { TopNavbar } from "@/components/layout/top-navbar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParams } from 'react-router-dom';
import { mockContactsById } from "@/components/stream/sample-data";
import { EmptyState } from "@/components/ui/empty-state";
import StreamViewLayout from '@/components/stream/StreamViewLayout';
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/utils/logger';
import { useGmailStore } from '@/stores/gmail/gmailStore';

export default function StreamView() {
  const isMobile = useIsMobile();
  const { id } = useParams();
  const { user } = useAuth();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const gmailStore = useGmailStore();

  // Initialize Gmail service once when user is available  
  useEffect(() => {
    // Fully restored: Gmail service with autoInitialize for seamless experience
    const initializeGmailService = async () => {
      if (user?.id && !gmailStore.service) {
        logger.info(`[StreamView] Initializing Gmail service for user: ${user.id}`);
        try {
          await gmailStore.initializeService(user.id, { 
            enableLogging: false // Keep logging minimal for production
          });
          // Load accounts after service initialization
          await gmailStore.loadAccounts();
        } catch (error) {
          logger.error('[StreamView] Error initializing Gmail service:', error);
        }
      }
    };
    
    initializeGmailService();
  }, [user?.id]); // Stable dependencies

  // Load contact data
  useEffect(() => {
    const loadContact = async () => {
      if (!id || !user) {
        setLoading(false);
        return;
      }
      
      // First check if contact is already in memory
      if (mockContactsById[id]) {
        setContact(mockContactsById[id]);
        setLoading(false);
        return;
      }
      
      // If not in memory, fetch from database
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          logger.error('Error fetching contact:', error);
          setContact(null);
        } else if (data) {
          // Transform the data to match the expected format
          const contactData = data.data && typeof data.data === 'object' ? data.data as Record<string, any> : {};
          const transformedContact = {
            id: data.id,
            name: data.name,
            email: data.email || '',
            phone: data.phone || '',
            company: data.company || '',
            status: data.status || '',
            ...contactData
          };
          
          // Also update mockContactsById for consistency
          mockContactsById[id] = transformedContact;
          setContact(transformedContact);
        }
      } catch (error) {
        logger.error('Error fetching contact:', error);
        setContact(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadContact();
  }, [id, user]);
  
  if (loading) {
    return (
      <div className="flex h-screen bg-slate-light/20">
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNavbar />
          <div className="overflow-auto flex-1">
            <div className={`px-6 pt-12 ${isMobile ? "pb-6" : "pb-6"}`}>
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary sectionName="Stream View">
      <div className="flex h-screen bg-slate-light/20">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TopNav is fixed at the top */}
          <TopNavbar />
          
          {/* Main content area with scrolling */}
          <div className="overflow-hidden flex-1">
            {/* Content with proper padding to account for fixed navbar */}
            <div className={`px-6 pt-12 ${isMobile ? "pb-6" : "pb-6"}`}>
              <ErrorBoundary sectionName="Stream Content">
                <StreamViewLayout contact={contact || {
                  id: id || 'not-found',
                  name: 'Contact Not Found',
                }} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
