
import { useState } from "react";
import { FileDown, Search, ChevronDown, Filter, Plus } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { GridView } from "@/components/list/grid-view";
import { StreamView } from "@/components/list/stream-view";
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
        
        {/* Toolbar with view mode selector */}
        <div className="bg-white border-b border-slate-light/30 p-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Checkbox */}
            <button className="p-1 rounded hover:bg-slate-light/20 text-slate-medium">
              <input type="checkbox" className="mr-2" />
            </button>
            
            {/* Download Button */}
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-light/20 text-slate-medium">
              <FileDown size={18} />
            </button>
            
            {/* Search Field */}
            <div className="flex items-center bg-white border border-slate-light/50 rounded px-2 py-1">
              <Search size={16} className="text-slate-medium" />
              <input 
                type="text" 
                placeholder="Search Field Values" 
                className="w-40 lg:w-56 border-none outline-none text-sm px-2"
              />
              <ChevronDown size={16} className="text-slate-medium" />
            </div>
            
            {/* View Mode Selector moved here */}
            <ViewModeSelector 
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
          
          <div className="flex items-center gap-4">
            {/* List Info */}
            <span className="text-sm text-slate-medium">28 Opportunities • DEMO</span>
            
            {/* Filter Button */}
            <button className="flex items-center gap-1 px-3 py-1 text-sm border border-slate-light/50 rounded">
              <Filter size={14} />
              <span>Filters</span>
              <span className="text-xs bg-teal-primary text-white rounded-full px-1.5">2</span>
            </button>
            
            {/* Add Button */}
            <button className="flex items-center gap-1 px-3 py-1 text-sm bg-teal-primary text-white rounded">
              <Plus size={14} />
              <span>Add Opportunity</span>
            </button>
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
