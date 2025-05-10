
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Filter, Download, Share, Plus } from 'lucide-react';

interface StreamToolbarProps {
  className?: string;
}

export default function StreamToolbar({ className = '' }: StreamToolbarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className={`flex items-center justify-between p-4 border-b ${className}`}>
      <div className="flex items-center gap-4">
        <SearchInput 
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search activities..."
          className="w-80"
        />
        <Button size="sm" variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
        <Button size="sm" variant="outline" className="gap-2">
          <Share className="w-4 h-4" />
          Share
        </Button>
        <Button size="sm" className="gap-2 bg-[#33B9B0] hover:bg-[#2aa39b] text-white">
          <Plus className="w-4 h-4" />
          Add Activity
        </Button>
      </div>
    </div>
  );
}
