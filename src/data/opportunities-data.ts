
// Sample data for the opportunities list
export const opportunityColumns = [
  { key: "opportunity", header: "Opportunity", type: "text" as const, editable: true, frozen: true },
  { key: "status", header: "Status", type: "status" as const, editable: true, options: [
    "Deal Won", "Qualified", "Contract Sent", "In Procurement", "Discovered", "Not Now" 
  ] },
  { key: "revenue", header: "Revenue", type: "currency" as const, editable: true },
  { key: "closeDate", header: "Close Date", type: "date" as const, editable: true },
  { key: "owner", header: "Owner", type: "text" as const, editable: true },
  { key: "employees", header: "Employees", type: "number" as const, editable: true },
];

export const opportunityData = [
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
