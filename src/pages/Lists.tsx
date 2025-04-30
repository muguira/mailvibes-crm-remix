
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { GridView } from "@/components/list/grid-view";
import { StreamView } from "@/components/list/stream-view";
import { ListPageHeader } from "@/components/list/list-page-header";
import { ViewModeSelector } from "@/components/list/view-mode-selector";
import { opportunityColumns, opportunityData } from "@/data/opportunities-data";
import { contacts } from "@/data/contacts-data";
import "@/components/list/grid-view.css";

const Lists = () => {
  const [viewMode, setViewMode] = useState<"grid" | "stream">("grid");
  const [currentList, setCurrentList] = useState("opportunities");
  
  return (
    <div className="flex h-screen bg-slate-light/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* Page title */}
        <ListPageHeader title="Lists – Opportunities" />
        
        {/* Toolbar with view mode selector */}
        <div className="bg-white border-b border-slate-light/30 p-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ViewModeSelector 
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {viewMode === "grid" ? (
            <GridView 
              columns={opportunityColumns} 
              data={opportunityData} 
              listName="Opportunities" 
              listType="Opportunity"
            />
          ) : (
            <StreamView 
              contacts={contacts} 
              listName="Opportunities"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Lists;
