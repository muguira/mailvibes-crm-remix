
import { TopNavbar } from "@/components/layout/top-navbar";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function StreamView() {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex h-screen bg-slate-light/20">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopNav is always rendered but hidden on mobile with CSS */}
        <TopNavbar className="md:flex hidden" />
        
        {/* Main content area with padding to prevent content from being hidden behind the bottom bar on mobile */}
        <div
          className={`p-8 text-lg text-[#1C4657] ${isMobile ? "pb-20" : ""}`}
        >
          StreamView skeleton – desktop only (Sprint 1)
        </div>
        
        {/* Bottom tab bar for mobile devices */}
        {isMobile && <BottomTabBar />}
      </div>
    </div>
  );
}
