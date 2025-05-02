
import React from 'react';
import { StreamProfileCard } from './index';
import { AboutThisContact } from './index';
import ActionRow from './ActionRow';
import MobileTabView from './MobileTabView';
import { sampleContact } from './sample-data';

export default function StreamViewLayout() {
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left rail - fixed 280px width on desktop */}
      <div className="w-full lg:w-[280px] shrink-0">
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
