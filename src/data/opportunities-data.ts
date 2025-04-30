
// Sample data for the opportunities list
export const opportunityColumns = [
  { key: "opportunity", header: "Opportunity", type: "text" as const, editable: true, frozen: true, width: 200 },
  { key: "status", header: "Status", type: "status" as const, editable: true, width: 150, options: [
    "Deal Won", "Qualified", "Contract Sent", "In Procurement", "Discovered", "Not Now" 
  ], colors: {
    "Deal Won": "#4ADE80",
    "Qualified": "#3B82F6",
    "Contract Sent": "#F97316",
    "In Procurement": "#A78BFA",
    "Discovered": "#F59E0B",
    "Not Now": "#A1A1AA"
  } },
  { key: "revenue", header: "Revenue", type: "currency" as const, editable: true, width: 120 },
  { key: "closeDate", header: "Close Date", type: "date" as const, editable: true, width: 160 },
  { key: "owner", header: "Owner", type: "text" as const, editable: true, width: 150 },
  { key: "website", header: "Website", type: "url" as const, editable: true, width: 180 },
  { key: "companyName", header: "Company Name", type: "text" as const, editable: true, width: 180 },
  { key: "companyLinkedin", header: "Company LinkedIn", type: "url" as const, editable: true, width: 180 },
  { key: "employees", header: "Employees", type: "number" as const, editable: true, width: 120 },
  { key: "lastContacted", header: "Last Contacted", type: "date" as const, editable: true, width: 160 },
  { key: "nextMeeting", header: "Next Meeting", type: "date" as const, editable: true, width: 160 },
  { key: "leadSource", header: "Lead Source", type: "select" as const, editable: true, width: 150, options: [
    "Website", "Referral", "Conference", "Cold Outreach", "Partner", "Other"
  ] },
  { key: "priority", header: "Priority", type: "status" as const, editable: true, width: 120, options: [
    "High", "Medium", "Low"
  ], colors: {
    "High": "#E11D48",
    "Medium": "#F59E0B",
    "Low": "#3B82F6"
  } }
];

export const opportunityData = [
  { id: "1", opportunity: "Avocado Inc", status: "Deal Won", revenue: "$5,000", closeDate: "September 24, 2023", owner: "Ryan DeForest", website: "https://avocado.com", companyName: "Avocado Inc", companyLinkedin: "https://linkedin.com/company/avocado", employees: 45, lastContacted: "September 20, 2023", nextMeeting: "October 5, 2023", leadSource: "Website", priority: "Medium" },
  { id: "2", opportunity: "Lulu - Product A", status: "Qualified", revenue: "$6,645", closeDate: "August 13, 2023", owner: "Kelly Singsank", website: "https://lulu.com", companyName: "Lulu Creative", companyLinkedin: "https://linkedin.com/company/lulu-creative", employees: 12, lastContacted: "August 10, 2023", nextMeeting: "August 24, 2023", leadSource: "Conference", priority: "High" },
  { id: "3", opportunity: "Lulu - Product B", status: "Deal Won", revenue: "$2,000", closeDate: "April 6, 2023", owner: "Rosie Roca", website: "https://lulu.com", companyName: "Lulu Creative", companyLinkedin: "https://linkedin.com/company/lulu-creative", employees: 12, lastContacted: "April 1, 2023", nextMeeting: "", leadSource: "Conference", priority: "Medium" },
  { id: "4", opportunity: "Pupware", status: "Deal Won", revenue: "$2,000", closeDate: "July 13, 2023", owner: "Kelly Singsank", website: "https://pupware.io", companyName: "Pupware Soft", companyLinkedin: "https://linkedin.com/company/pupware", employees: 8, lastContacted: "July 10, 2023", nextMeeting: "July 25, 2023", leadSource: "Referral", priority: "Medium" },
  { id: "5", opportunity: "Big Data Bear Analytics", status: "Contract Sent", revenue: "$9,950", closeDate: "March 15, 2023", owner: "Kelly Singsank", website: "https://bigdatabear.ai", companyName: "Big Data Bear", companyLinkedin: "https://linkedin.com/company/bigdatabear", employees: 32, lastContacted: "March 12, 2023", nextMeeting: "March 20, 2023", leadSource: "Partner", priority: "High" },
  { id: "6", opportunity: "Romy", status: "Deal Won", revenue: "$9,500", closeDate: "July 31, 2023", owner: "Edie Robinson", website: "https://romy.tech", companyName: "Romy Technologies", companyLinkedin: "https://linkedin.com/company/romy-tech", employees: 24, lastContacted: "July 29, 2023", nextMeeting: "August 15, 2023", leadSource: "Website", priority: "Medium" },
  { id: "7", opportunity: "Tommy2Step", status: "Deal Won", revenue: "$9,456", closeDate: "April 29, 2023", owner: "Rosie Roca", website: "https://tommy2step.com", companyName: "Tommy2Step Software", companyLinkedin: "https://linkedin.com/company/tommy2step", employees: 18, lastContacted: "April 25, 2023", nextMeeting: "", leadSource: "Cold Outreach", priority: "Low" },
  { id: "8", opportunity: "Google - Renewal", status: "Qualified", revenue: "$4,000", closeDate: "August 29, 2023", owner: "Rosie Roca", website: "https://google.com", companyName: "Google Inc", companyLinkedin: "https://linkedin.com/company/google", employees: 156000, lastContacted: "August 25, 2023", nextMeeting: "September 5, 2023", leadSource: "Partner", priority: "High" },
  { id: "9", opportunity: "Living Well", status: "Deal Won", revenue: "$9,000", closeDate: "August 7, 2023", owner: "Rosie Roca", website: "https://livingwell.co", companyName: "Living Well Co", companyLinkedin: "https://linkedin.com/company/livingwell", employees: 42, lastContacted: "August 3, 2023", nextMeeting: "", leadSource: "Conference", priority: "Medium" },
  { id: "10", opportunity: "Tequila", status: "Deal Won", revenue: "$9,000", closeDate: "July 3, 2023", owner: "Rudy S.", website: "https://tequila.co", companyName: "Tequila Software", companyLinkedin: "https://linkedin.com/company/tequila-software", employees: 27, lastContacted: "June 30, 2023", nextMeeting: "", leadSource: "Referral", priority: "Medium" },
  { id: "11", opportunity: "Sushi Rito Inc.", status: "Deal Won", revenue: "$6,645", closeDate: "July 7, 2023", owner: "Moxxy Schoeffer", website: "https://sushirito.com", companyName: "Sushi Rito Inc", companyLinkedin: "https://linkedin.com/company/sushirito", employees: 15, lastContacted: "July 5, 2023", nextMeeting: "", leadSource: "Website", priority: "Low" },
  { id: "12", opportunity: "Techqueria", status: "Not Now", revenue: "$6,645", closeDate: "March 15, 2023", owner: "Moxxy Schoeffer", website: "https://techqueria.org", companyName: "Techqueria", companyLinkedin: "https://linkedin.com/company/techqueria", employees: 2, lastContacted: "March 10, 2023", nextMeeting: "", leadSource: "Conference", priority: "Low" },
  { id: "13", opportunity: "Scoop", status: "Discovered", revenue: "$5,000", closeDate: "August 10, 2023", owner: "Kelly Singsank", website: "https://scoop.io", companyName: "Scoop Technologies", companyLinkedin: "https://linkedin.com/company/scoop-tech", employees: 154, lastContacted: "August 5, 2023", nextMeeting: "August 15, 2023", leadSource: "Cold Outreach", priority: "Medium" },
  { id: "14", opportunity: "Avocado Inc - Upsell", status: "Discovered", revenue: "$2,499", closeDate: "May 16, 2023", owner: "Kelly Singsank", website: "https://avocado.com", companyName: "Avocado Inc", companyLinkedin: "https://linkedin.com/company/avocado", employees: 45, lastContacted: "May 12, 2023", nextMeeting: "May 25, 2023", leadSource: "Partner", priority: "High" },
  { id: "15", opportunity: "Bob's Donuts", status: "In Procurement", revenue: "$2,507", closeDate: "April 15, 2023", owner: "Kelly Singsank", website: "https://bobsdonuts.com", companyName: "Bob's Donuts LLC", companyLinkedin: "https://linkedin.com/company/bobs-donuts", employees: 13, lastContacted: "April 10, 2023", nextMeeting: "April 20, 2023", leadSource: "Website", priority: "Low" }
];
