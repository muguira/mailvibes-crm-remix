
import React from 'react';
import StreamProfileCard from './StreamProfileCard';
import ActionRow from './ActionRow';
import TabStrip from './TabStrip';

export default function StreamHeader() {
  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Profile card - left side on desktop, top on mobile */}
        <div className="md:w-[280px] shrink-0">
          <StreamProfileCard />
        </div>
        
        {/* Action buttons - right side on desktop, below profile on mobile */}
        <div className="flex-1 flex items-center justify-center md:justify-start">
          <ActionRow className="w-full md:w-auto" />
        </div>
      </div>
      
      {/* Tab strip - below header on both layouts */}
      <TabStrip className="sticky top-0 bg-slate-light/20 z-10" />
    </div>
  );
}
