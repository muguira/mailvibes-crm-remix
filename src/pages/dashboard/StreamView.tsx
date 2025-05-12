import { TopNavbar } from "@/components/layout/top-navbar";
import { useIsMobile } from "@/hooks/use-mobile";
import StreamHeader from '@/components/stream/StreamHeader';
import { useParams } from 'react-router-dom';
import { mockContactsById } from "@/components/stream/sample-data";
import StreamViewLayout from '@/components/stream/StreamViewLayout';

export default function StreamView() {
  const isMobile = useIsMobile();
  const { recordId } = useParams();

  // Get the contact data based on the URL parameter
  const contact = recordId ? mockContactsById[recordId] : undefined;

  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopNav is fixed at the top */}
        <TopNavbar />

        {/* Main content area with scrolling */}
        <div className="overflow-auto flex-1">
          {/* Content with proper padding to account for fixed navbar */}
          <div className={`px-6 pt-12 ${isMobile ? "pb-6" : "pb-6"}`}>
            <StreamHeader />

            <StreamViewLayout contact={contact || {
              id: 'not-found',
              name: '',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
