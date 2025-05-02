
import React from 'react';
import StreamProfileCard from './StreamProfileCard';
import ActionRow from './ActionRow';
import TabStrip from './TabStrip';
import AboutThisContact from './AboutThisContact';

export default function StreamHeader() {
  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col md:flex-col gap-6">
        {/* Profile card - always on top in both layouts */}
        <div className="w-full md:w-[280px] shrink-0">
          <StreamProfileCard />
        </div>
        
        {/* Action buttons - below profile on both layouts, but centered under card on desktop */}
        <div className="flex items-center justify-center w-full md:w-[280px]">
          <ActionRow className="w-full" />
        </div>
      </div>
      
      {/* Tab strip - below header on both layouts */}
      <TabStrip className="mt-6" />
      
      {/* About This Contact card - desktop only */}
      <div className="hidden lg:block">
        <AboutThisContact />
      </div>
    </div>
  );
}
