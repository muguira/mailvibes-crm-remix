
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { GridView, ColumnDef } from "@/components/list/grid-view";
import { StreamView } from "@/components/list/stream-view";
import { List, Grid, Menu, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import "@/components/list/grid-view.css";

// Define column types to match the ColumnDef interface
const columns: ColumnDef[] = [
  { key: "opportunity", header: "Opportunity", type: "text", editable: true, frozen: true },
  { key: "status", header: "Status", type: "status", editable: true, options: [
    "Deal Won", "Qualified", "Contract Sent", "In Procurement", "Discovered", "Not Now" 
  ] },
  { key: "revenue", header: "Revenue", type: "currency", editable: true },
  { key: "closeDate", header: "Close Date", type: "date", editable: true },
  { key: "owner", header: "Owner", type: "text", editable: true },
  { key: "employees", header: "Employees", type: "number", editable: true },
];

// Sample data
const data = [
  { id: "1", opportunity: "Avocado Inc", status: "Deal Won", revenue: "$5,000", closeDate: "September 24, 2023", owner: "Ryan DeForest", employees: 0 },
  { id: "2", opportunity: "Lulu - Product A", status: "Qualified", revenue: "$6,645", closeDate: "August 13, 2023", owner: "Kelly Singsank", employees: 0 },
  { id: "3", opportunity: "Lulu - Product B", status: "Deal Won", revenue: "$2,000", closeDate: "April 6, 2023", owner: "Rosie Roca", employees: 0 },
  { id: "4", opportunity: "Pupware", status: "Deal Won", revenue: "$2,000", closeDate: "July 13, 2023", owner: "Kelly Singsank", employees: 0 },
  { id: "5", opportunity: "Big Data Bear Analytics", status: "Contract Sent", revenue: "$9,950", closeDate: "March 15, 2023", owner: "Kelly Singsank", employees: 0 },
  { id: "6", opportunity: "Romy", status: "Deal Won", revenue: "$9,500", closeDate: "July 31, 2023", owner: "Edie Robinson", employees: 0 },
  { id: "7", opportunity: "Tommy2Step", status: "Deal Won", revenue: "$9,456", closeDate: "April 29, 2023", owner: "Rosie Roca", employees: 0 },
  { id: "8", opportunity: "Google - Renewal", status: "Qualified", revenue: "$4,000", closeDate: "August 29, 2023", owner: "Rosie Roca", employees: 0 },
  { id: "9", opportunity: "Living Well", status: "Deal Won", revenue: "$9,000", closeDate: "August 7, 2023", owner: "Rosie Roca", employees: 0 },
  { id: "10", opportunity: "Tequila", status: "Deal Won", revenue: "$9,000", closeDate: "July 3, 2023", owner: "Rudy S.", employees: 0 },
  { id: "11", opportunity: "Sushi Rito Inc.", status: "Deal Won", revenue: "$6,645", closeDate: "July 7, 2023", owner: "Moxxy Schoeffer", employees: 0 },
  { id: "12", opportunity: "Techqueria", status: "Not Now", revenue: "$6,645", closeDate: "March 15, 2023", owner: "Moxxy Schoeffer", employees: 2 },
  { id: "13", opportunity: "Scoop", status: "Discovered", revenue: "$5,000", closeDate: "August 10, 2023", owner: "Kelly Singsank", employees: 154 },
  { id: "14", opportunity: "Avocado Inc - Upsell", status: "Discovered", revenue: "$2,499", closeDate: "May 16, 2023", owner: "Kelly Singsank", employees: 0 },
  { id: "15", opportunity: "Bob's Donuts", status: "In Procurement", revenue: "$2,507", closeDate: "April 15, 2023", owner: "Kelly Singsank", employees: 13 }
];

// Update ActivityItem type properties to use the correct literal types
const contacts = [
  {
    id: "1",
    name: "Jack of Trades, Inc.",
    lastActivity: "4h",
    activities: [
      {
        id: "1",
        type: "update" as const,
        timestamp: "4h",
        content: "",
        user: { name: "Rudy's Admin", initials: "RA" },
        field: { name: "Revenue", value: "$10,000" }
      },
      {
        id: "2",
        type: "note" as const,
        timestamp: "4h",
        content: "Deal Won!",
        user: { name: "Rudy Admin", initials: "RA" }
      },
      {
        id: "3",
        type: "update" as const,
        timestamp: "4h",
        content: "",
        user: { name: "Rudy's Admin", initials: "RA" },
        field: { name: "Close Date", value: "August 24, 2023" }
      },
      {
        id: "4",
        type: "update" as const,
        timestamp: "4h",
        content: "",
        user: { name: "Rudy's Admin", initials: "RA" },
        field: { name: "Added", value: "Jack of Trades, Inc." }
      },
      {
        id: "5",
        type: "task-complete" as const,
        timestamp: "1mo 15d",
        content: "Jennifer Raffard marked a follow up task with Jill Trades complete",
        user: { name: "Jennifer Raffard", initials: "JR" }
      },
      {
        id: "6",
        type: "call" as const,
        timestamp: "1mo 24d",
        content: "Deal going well!",
        user: { name: "Jennifer Raffard", initials: "JR" }
      }
    ],
    fields: {
      "Status": "Deal Won",
      "Employees": "11-50",
      "Revenue": "$10,000",
      "Close Date": "August 24, 2023",
      "Owner": "Rudy S.",
      "Inactive (days)": "55"
    }
  },
  {
    id: "2",
    name: "Marina",
    lastActivity: "4h",
    activities: [
      {
        id: "1",
        type: "update" as const,
        timestamp: "4h",
        content: "",
        user: { name: "Kelly Singsank", initials: "KS" },
        field: { name: "Status", value: "Qualified" }
      }
    ],
    fields: {
      "Status": "Qualified",
      "Revenue": "$3,500",
      "Close Date": "September 15, 2023",
      "Owner": "Kelly Singsank"
    }
  },
  {
    id: "3",
    name: "Plane Photos",
    company: "Aviation Media Inc.",
    lastActivity: "4h",
    activities: [
      {
        id: "1",
        type: "note" as const,
        timestamp: "4h",
        content: "Client wants additional features in the package",
        user: { name: "Rosie Roca", initials: "RR" }
      }
    ],
    fields: {
      "Status": "Negotiation",
      "Revenue": "$12,000",
      "Close Date": "October 5, 2023",
      "Owner": "Rosie Roca"
    }
  },
  {
    id: "4",
    name: "Lulu - Product A",
    lastActivity: "5h",
    activities: [
      {
        id: "1",
        type: "update" as const,
        timestamp: "5h",
        content: "",
        user: { name: "Kelly Singsank", initials: "KS" },
        field: { name: "Revenue", value: "$6,645" }
      }
    ],
    fields: {
      "Status": "Qualified",
      "Revenue": "$6,645",
      "Close Date": "August 13, 2023",
      "Owner": "Kelly Singsank"
    }
  },
  {
    id: "5",
    name: "Lulu - Product B",
    lastActivity: "5h",
    activities: [],
    fields: {
      "Status": "Deal Won",
      "Revenue": "$2,000",
      "Close Date": "April 6, 2023",
      "Owner": "Rosie Roca"
    }
  }
];

const Lists = () => {
  const [viewMode, setViewMode] = useState<"grid" | "stream">("grid");
  const [currentList, setCurrentList] = useState("opportunities");
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <div className="flex h-screen bg-slate-light/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        {/* Page Header - Salesforce style */}
        <div className="page-header">
          Lists – Opportunities
        </div>
        
        {/* Toolbar */}
        <div className="toolbar">
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <div className="search-field">
              <Search size={16} className="text-slate-medium" />
              <input 
                type="text" 
                placeholder="Search Field Values" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 lg:w-56"
              />
              <ChevronDown size={16} className="text-slate-medium" />
            </div>
            
            {/* View Toggle */}
            <div className="view-toggle">
              <button 
                className={`flex items-center ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                <Grid size={16} className={viewMode === "grid" ? "text-teal-primary" : "text-slate-medium"} />
              </button>
              <button 
                className={`flex items-center ${viewMode === "stream" ? "active" : ""}`}
                onClick={() => setViewMode("stream")}
              >
                <List size={16} className={viewMode === "stream" ? "text-teal-primary" : "text-slate-medium"} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center">
            <span className="text-sm text-slate-medium mr-2">28 Opportunities • DEMO</span>
            <button className="bg-teal-primary text-white rounded px-4 py-2 text-sm font-medium flex items-center gap-1 hover:bg-teal-primary/90">
              <span>Add Opportunity • DEMO</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {viewMode === "grid" ? (
            <GridView 
              columns={columns} 
              data={data} 
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
