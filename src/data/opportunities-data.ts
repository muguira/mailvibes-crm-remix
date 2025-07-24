
// Sample data for the opportunities list
export const opportunityColumns = [
  { key: "opportunity", header: "Opportunity", type: "text" as const, editable: true, frozen: true },
  { 
    key: "status", 
    header: "Status", 
    type: "status" as const, 
    editable: true, 
    options: ["Lead/New", "Qualified", "Discovery", "Proposal", "Negotiation", "Closing", "Won", "Lost"],
    colors: {
      "Lead/New": "#6b7280",
      "Qualified": "#3b82f6",
      "Discovery": "#f97316",
      "Proposal": "#eab308",
      "Negotiation": "#8b5cf6",
      "Closing": "#06b6d4",
      "Won": "#22c55e",
      "Lost": "#ef4444"
    } 
  },
  { key: "revenue", header: "Revenue", type: "currency" as const, editable: true },
  { key: "closeDate", header: "Close Date", type: "date" as const, editable: true },
  { key: "owner", header: "Owner", type: "text" as const, editable: true },
  { key: "website", header: "Website", type: "url" as const, editable: true },
  { key: "companyName", header: "Company Name", type: "text" as const, editable: true },
  { key: "companyLinkedin", header: "Company LinkedIn", type: "url" as const, editable: true },
  { key: "employees", header: "Employees", type: "number" as const, editable: true },
  { key: "lastContacted", header: "Last Contacted", type: "date" as const, editable: true },
  { key: "nextMeeting", header: "Next Meeting", type: "date" as const, editable: true },
  { 
    key: "leadSource", 
    header: "Lead Source", 
    type: "select" as const, 
    editable: true,
    options: ["Website", "Referral", "Conference", "Social Media", "Direct", "Partner", "Other"]
  },
  { 
    key: "priority", 
    header: "Priority", 
    type: "select" as const, 
    editable: true,
    options: ["High", "Medium", "Low"]
  }
];

export const opportunityData = [
  { id: "1", opportunity: "Avocado Inc", status: "Won", revenue: "$5,000", closeDate: "September 24, 2023", owner: "Ryan DeForest", employees: 120, website: "https://avocado.com", companyName: "Avocado Inc", companyLinkedin: "https://linkedin.com/company/avocado", lastContacted: "April 15, 2023", nextMeeting: "", leadSource: "Website", priority: "High" },
  { id: "2", opportunity: "Lulu - Product A", status: "Qualified", revenue: "$6,645", closeDate: "August 13, 2023", owner: "Kelly Singsank", employees: 45, website: "https://lulu.io", companyName: "Lulu Technologies", companyLinkedin: "https://linkedin.com/company/lulu-tech", lastContacted: "March 22, 2023", nextMeeting: "May 15, 2023", leadSource: "Conference", priority: "High" },
  { id: "3", opportunity: "Lulu - Product B", status: "Won", revenue: "$2,000", closeDate: "April 6, 2023", owner: "Rosie Roca", employees: 45, website: "https://lulu.io", companyName: "Lulu Technologies", companyLinkedin: "https://linkedin.com/company/lulu-tech", lastContacted: "February 12, 2023", nextMeeting: "", leadSource: "Conference", priority: "Medium" },
  { id: "4", opportunity: "Pupware", status: "Won", revenue: "$2,000", closeDate: "July 13, 2023", owner: "Kelly Singsank", employees: 12, website: "https://pupware.co", companyName: "Pupware Inc", companyLinkedin: "https://linkedin.com/company/pupware", lastContacted: "June 30, 2023", nextMeeting: "", leadSource: "Referral", priority: "Medium" },
  { id: "5", opportunity: "Big Data Bear Analytics", status: "Proposal", revenue: "$9,950", closeDate: "March 15, 2023", owner: "Kelly Singsank", employees: 85, website: "https://bigdatabear.com", companyName: "Big Data Bear", companyLinkedin: "https://linkedin.com/company/big-data-bear", lastContacted: "March 1, 2023", nextMeeting: "March 20, 2023", leadSource: "Partner", priority: "High" },
  { id: "6", opportunity: "Romy", status: "Won", revenue: "$9,500", closeDate: "July 31, 2023", owner: "Edie Robinson", employees: 34, website: "https://romytech.com", companyName: "Romy Technologies", companyLinkedin: "https://linkedin.com/company/romy-tech", lastContacted: "July 20, 2023", nextMeeting: "", leadSource: "Website", priority: "Medium" },
  { id: "7", opportunity: "Tommy2Step", status: "Won", revenue: "$9,456", closeDate: "April 29, 2023", owner: "Rosie Roca", employees: 5, website: "https://tommy2step.io", companyName: "Tommy2Step", companyLinkedin: "https://linkedin.com/company/tommy2step", lastContacted: "April 15, 2023", nextMeeting: "", leadSource: "Social Media", priority: "Medium" },
  { id: "8", opportunity: "Google - Renewal", status: "Negotiation", revenue: "$4,000", closeDate: "August 29, 2023", owner: "Rosie Roca", employees: 156000, website: "https://google.com", companyName: "Google Inc", companyLinkedin: "https://linkedin.com/company/google", lastContacted: "August 5, 2023", nextMeeting: "September 1, 2023", leadSource: "Direct", priority: "High" },
  { id: "9", opportunity: "Living Well", status: "Won", revenue: "$9,000", closeDate: "August 7, 2023", owner: "Rosie Roca", employees: 67, website: "https://livingwell.com", companyName: "Living Well Co", companyLinkedin: "https://linkedin.com/company/living-well", lastContacted: "July 25, 2023", nextMeeting: "", leadSource: "Referral", priority: "High" },
  { id: "10", opportunity: "Tequila", status: "Won", revenue: "$9,000", closeDate: "July 3, 2023", owner: "Rudy S.", employees: 42, website: "https://tequilaco.com", companyName: "Tequila Co", companyLinkedin: "https://linkedin.com/company/tequilaco", lastContacted: "June 20, 2023", nextMeeting: "", leadSource: "Partner", priority: "Medium" },
  { id: "11", opportunity: "Sushi Rito Inc.", status: "Won", revenue: "$6,645", closeDate: "July 7, 2023", owner: "Moxxy Schoeffer", employees: 23, website: "https://sushirito.com", companyName: "Sushi Rito Inc", companyLinkedin: "https://linkedin.com/company/sushirito", lastContacted: "June 25, 2023", nextMeeting: "", leadSource: "Conference", priority: "Medium" },
  { id: "12", opportunity: "Techqueria", status: "Lost", revenue: "$6,645", closeDate: "March 15, 2023", owner: "Moxxy Schoeffer", employees: 2, website: "https://techqueria.org", companyName: "Techqueria", companyLinkedin: "https://linkedin.com/company/techqueria", lastContacted: "February 20, 2023", nextMeeting: "", leadSource: "Social Media", priority: "Low" },
  { id: "13", opportunity: "Scoop", status: "Discovery", revenue: "$5,000", closeDate: "August 10, 2023", owner: "Kelly Singsank", employees: 154, website: "https://scoop.co", companyName: "Scoop Technologies", companyLinkedin: "https://linkedin.com/company/scoop-tech", lastContacted: "July 30, 2023", nextMeeting: "August 15, 2023", leadSource: "Website", priority: "Medium" },
  { id: "14", opportunity: "Avocado Inc - Upsell", status: "Discovery", revenue: "$2,499", closeDate: "May 16, 2023", owner: "Kelly Singsank", employees: 120, website: "https://avocado.com", companyName: "Avocado Inc", companyLinkedin: "https://linkedin.com/company/avocado", lastContacted: "May 1, 2023", nextMeeting: "May 20, 2023", leadSource: "Direct", priority: "High" },
  { id: "15", opportunity: "Bob's Donuts", status: "Closing", revenue: "$2,507", closeDate: "April 15, 2023", owner: "Kelly Singsank", employees: 13, website: "https://bobsdonuts.com", companyName: "Bob's Donuts Inc", companyLinkedin: "https://linkedin.com/company/bobs-donuts", lastContacted: "April 1, 2023", nextMeeting: "April 20, 2023", leadSource: "Referral", priority: "Medium" }
];
