
import React from 'react';
import { StreamProfileCard } from './index';
import { AboutThisContact } from './index';
import ActionRow from './ActionRow';
import MobileTabView from './MobileTabView';
import { sampleContact } from './sample-data';

// Desktop left rail width constant
const LEFT_RAIL_WIDTH = 400; // px 

export default function StreamViewLayout() {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left rail - w-full on mobile, fixed 400px width on desktop */}
      <div 
        className="w-full lg:w-[400px] shrink-0"
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
      
      {/* Main content area - takes remaining space on desktop */}
      <div className="w-full lg:flex-grow bg-muted/50 min-h-[300px] rounded-md flex items-center justify-center p-6 overflow-y-auto lg:overflow-visible pb-24 lg:pb-6">
        <p className="text-muted-foreground">Stream timeline will render here...</p>
      </div>
    </div>
  );
}
