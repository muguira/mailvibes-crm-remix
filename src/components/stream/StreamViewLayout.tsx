
import React from 'react';
import { StreamProfileCard } from './index';
import { AboutThisContact } from './index';
import ActionRow from './ActionRow';
import MobileTabView from './MobileTabView';
import StreamTimeline from './StreamTimeline';
import StreamToolbar from './StreamToolbar';
import FilterPanel from './FilterPanel';
import { sampleContact } from './sample-data';

// Layout constants
const LEFT_RAIL_WIDTH = 400; // px
const RIGHT_RAIL_WIDTH = 300; // px

export default function StreamViewLayout() {
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
          <StreamProfileCard />
          
          {/* Action row - visible on all screen sizes, below profile card */}
          <div className="mt-6 flex items-center justify-center">
            <ActionRow className="w-full" />
          </div>
          
          {/* Mobile Tab View - only visible on mobile/tablet */}
          <div className="mt-4">
            <MobileTabView />
          </div>
          
          {/* About This Contact - only visible on desktop with single-column layout */}
          <div className="hidden lg:block mt-4">
            <AboutThisContact compact={true} leadStatus={sampleContact.leadStatus} />
          </div>
        </div>
        
        {/* Main content area - desktop only */}
        <div className="hidden lg:block flex-1 bg-slate-light/5 rounded-md overflow-y-auto self-start">
          <StreamTimeline />
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
