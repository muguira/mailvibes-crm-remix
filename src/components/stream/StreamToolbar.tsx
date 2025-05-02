
import React from 'react';
import { Search, Filter, LayoutGrid } from 'lucide-react';

export default function StreamToolbar() {
  return (
    <div className="h-12 border-b border-slate-light/30 flex items-center justify-between px-4 bg-white">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button className="p-1 rounded hover:bg-slate-light/20">
          <LayoutGrid className="h-5 w-5 text-slate-medium" />
        </button>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search activities..."
            className="pl-8 pr-4 py-1 text-sm border border-slate-light/40 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-primary"
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-medium" />
        </div>
      </div>
      
      {/* Right section */}
      <div className="flex items-center gap-2">
        <span className="text-xs bg-slate-light/30 text-slate-dark px-2 py-1 rounded-full">
          29 Activities
        </span>
        <button className="p-1 rounded hover:bg-slate-light/20">
          <Filter className="h-5 w-5 text-slate-medium" />
        </button>
      </div>
    </div>
  );
}
