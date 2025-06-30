import { TopNavbar } from "@/components/layout/top-navbar";
import { useIsMobile } from "@/hooks/use-mobile";
import StreamHeader from '@/components/stream/StreamHeader';
import { useParams } from 'react-router-dom';
import { mockContactsById } from "@/components/stream/sample-data";
import { EmptyState } from "@/components/ui/empty-state";
import StreamViewLayout from '@/components/stream/StreamViewLayout';
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";

export default function StreamView() {
  const isMobile = useIsMobile();
  const { recordId } = useParams();
  
  // Get the contact data based on the URL parameter
  const contact = recordId ? mockContactsById[recordId] : undefined;
  
  return (
    <ErrorBoundary sectionName="Stream View">
      <div className="flex h-screen bg-slate-light/20">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* TopNav is fixed at the top */}
          <TopNavbar />
          
          {/* Main content area with scrolling */}
          <div className="overflow-auto flex-1">
            {/* Content with proper padding to account for fixed navbar */}
            <div className={`px-6 pt-12 ${isMobile ? "pb-6" : "pb-6"}`}>
              <StreamHeader />
              
              <ErrorBoundary sectionName="Stream Content">
                <StreamViewLayout contact={contact || {
                  id: 'not-found',
                  name: '',
                }} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
