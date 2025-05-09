import { TopNavbar } from "@/components/layout/top-navbar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import StreamHeader from '@/components/stream/StreamHeader';
import { useParams } from 'react-router-dom';
import { mockContactsById } from "@/components/stream/sample-data";
import { EmptyState } from "@/components/ui/empty-state";
import StreamViewLayout from '@/components/stream/StreamViewLayout';

export default function StreamView() {
  const isMobile = useIsMobile();
  const { recordId } = useParams();
  
  // Get the contact data based on the URL parameter
  const contact = recordId ? mockContactsById[recordId] : undefined;
  
  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopNav is always rendered but hidden on mobile with CSS */}
        <TopNavbar className="md:flex hidden" />
        
        {/* Main content area with significantly more top padding */}
        <div
          className={`p-6 pt-8 ${isMobile ? "pb-20" : ""} overflow-auto`}
        >
          <div className="mt-4">
          <StreamHeader />
          
          <StreamViewLayout contact={contact || {
            id: 'not-found',
            name: '',
          }} />
          </div>
        </div>
        
        {/* Bottom tab bar for mobile devices */}
        {isMobile && <BottomTabBar />}
      </div>
    </div>
  );
}
