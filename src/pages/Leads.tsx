
import React from 'react';
import { TopNavbar } from "@/components/layout/top-navbar";
import { EditableLeadsGrid } from '@/components/grid-view/EditableLeadsGrid';

const LeadsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-screen">
      <TopNavbar />
      <div className="flex-1 overflow-hidden">
        <EditableLeadsGrid />
      </div>
    </div>
  );
};

export default LeadsPage;
