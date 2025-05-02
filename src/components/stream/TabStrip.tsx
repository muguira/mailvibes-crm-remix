
import React, { useState } from 'react';
import { cn } from "@/lib/utils";

interface TabStripProps {
  className?: string;
}

export default function TabStrip({ className = '' }: TabStripProps) {
  const [activeTab, setActiveTab] = useState("Stream");
  
  // Tab configuration
  const tabs = ["Stream", "Associations", "About"];

  return (
    <div className={`w-full ${className}`}>
      <div className="flex border-b border-slate-light/30">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab 
                ? "border-teal-primary text-[#173E4D]" 
                : "border-transparent text-[#6A7A84] hover:text-slate-dark hover:border-slate-light/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="py-4 text-muted-foreground">
        {activeTab} tab content coming soon...
      </div>
    </div>
  );
}
