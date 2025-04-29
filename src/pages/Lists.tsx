
import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { GridView } from "@/components/list/grid-view";
import { StreamView } from "@/components/list/stream-view";
import { List, Grid, Menu } from "lucide-react";

// Define column types to match the ColumnDef interface
const columns = [
  { key: "opportunity", header: "Opportunity", type: "text" as const, editable: true },
  { key: "status", header: "Status", type: "status" as const, editable: true },
  { key: "revenue", header: "Revenue", type: "number" as const, editable: true },
  { key: "closeDate", header: "Close Date", type: "date" as const, editable: true },
  { key: "owner", header: "Owner", type: "text" as const, editable: true },
  { key: "employees", header: "Employees", type: "number" as const, editable: true },
];

const data = [
  { id: "1", opportunity: "Avocado Inc", status: "Deal Won", revenue: "$5,000", closeDate: "Sep 24, 2023", owner: "Ryan DeForest", employees: 0 },
  { id: "2", opportunity: "Lulu - Product A", status: "Qualified", revenue: "$6,645", closeDate: "Aug 13, 2023", owner: "Kelly Singsank", employees: 0 },
  { id: "3", opportunity: "Lulu - Product B", status: "Deal Won", revenue: "$2,000", closeDate: "Apr 6, 2023", owner: "Rosie Roca", employees: 0 },
  { id: "4", opportunity: "Pupware", status: "Deal Won", revenue: "$2,000", closeDate: "Jul 13, 2023", owner: "Kelly Singsank", employees: 0 },
  { id: "5", opportunity: "Big Data Bear Analytics", status: "Contract Sent", revenue: "$9,950", closeDate: "Mar 15, 2023", owner: "Kelly Singsank", employees: 0 },
  { id: "6", opportunity: "Romy", status: "Deal Won", revenue: "$9,500", closeDate: "Jul 31, 2023", owner: "Edie Robinson", employees: 0 },
  { id: "7", opportunity: "Tommy2Step", status: "Deal Won", revenue: "$9,456", closeDate: "Apr 29, 2023", owner: "Rosie Roca", employees: 0 },
  { id: "8", opportunity: "Google - Renewal", status: "Qualified", revenue: "$4,000", closeDate: "Aug 29, 2023", owner: "Rosie Roca", employees: 0 },
  { id: "9", opportunity: "Living Well", status: "Deal Won", revenue: "$9,000", closeDate: "Aug 7, 2023", owner: "Rosie Roca", employees: 0 },
  { id: "10", opportunity: "Tequila", status: "Deal Won", revenue: "$9,000", closeDate: "Jul 3, 2023", owner: "Rudy S.", employees: 0 },
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
  
  return (
    <div className="flex h-screen bg-slate-light/20">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <div className="bg-white border-b border-slate-light/30 p-3 flex items-center justify-between">
          <div className="flex items-center">
            <button className="text-slate-dark font-semibold text-lg flex items-center gap-2">
              Opportunities
              <Menu size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-medium">29 Opportunities</span>
            <div className="border-l border-slate-light/50 h-6 mx-2"></div>
            <div className="flex items-center p-1 bg-slate-light/20 rounded">
              <button 
                className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
                onClick={() => setViewMode("grid")}
              >
                <Grid size={18} className={viewMode === "grid" ? "text-teal-primary" : "text-slate-medium"} />
              </button>
              <button 
                className={`p-1.5 rounded ${viewMode === "stream" ? "bg-white shadow-sm" : ""}`}
                onClick={() => setViewMode("stream")}
              >
                <List size={18} className={viewMode === "stream" ? "text-teal-primary" : "text-slate-medium"} />
              </button>
            </div>
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
