
import React from 'react';
import { EditableLeadsGrid } from '@/components/grid-view/EditableLeadsGrid';
import { TopNavbar } from "@/components/layout/top-navbar";

// Leads page component
const Leads: React.FC = () => {
  return (
    <div className="flex flex-col h-screen">
      <TopNavbar />
      <div className="flex-1 overflow-hidden">
        <EditableLeadsGrid />
      </div>
    </div>
  );
};

export default Leads;
