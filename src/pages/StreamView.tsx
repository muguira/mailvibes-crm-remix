
import { TopNavbar } from "@/components/layout/top-navbar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import StreamProfileCard from '@/components/stream/StreamProfileCard';

export default function StreamView() {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopNav is always rendered but hidden on mobile with CSS */}
        <TopNavbar className="md:flex hidden" />
        
        {/* Main content area with padding to prevent content from being hidden behind the bottom bar on mobile */}
        <div
          className={`p-6 ${isMobile ? "pb-20" : ""} overflow-auto`}
        >
          <div className="flex flex-col md:flex-row gap-6">
            {/* left column – profile card */}
            <div className="md:w-[280px] shrink-0">
              <StreamProfileCard />
            </div>

            {/* right column – placeholder for future tabs/stream */}
            <div className="flex-1">
              <div className="text-muted-foreground">
                {/* placeholder text to show something */}
                Stream tab content coming soon…
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom tab bar for mobile devices */}
        {isMobile && <BottomTabBar />}
      </div>
    </div>
  );
}
