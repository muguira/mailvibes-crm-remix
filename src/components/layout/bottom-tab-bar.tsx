import { Link } from "react-router-dom";
import { Home, Users, Briefcase, BarChart2 } from "lucide-react";

type TabItem = {
  name: string;
  href: string;
  icon: React.ElementType;
};

const tabs: TabItem[] = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Leads", href: "/dashboard/leads", icon: Users },
  { name: "Opportunities", href: "/dashboard/lists", icon: Briefcase },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart2 },
];

export function BottomTabBar() {
  // In a real implementation, we would determine the active tab based on the current route
  const activeTab = window.location.pathname;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#EDEDEB] md:hidden">
      {/* Navigation tabs */}
      <div className="flex justify-around items-center h-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.href;
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className="flex flex-col items-center justify-center w-full h-full"
            >
              <tab.icon
                className={`h-5 w-5 ${isActive ? "text-teal-primary" : "text-slate-medium"
                  }`}
              />
              <span
                className={`text-xs mt-1 ${isActive ? "text-teal-primary" : "text-slate-medium"
                  }`}
              >
                {tab.name}
              </span>
              {tab.name}
              <tab.icon
                className={`h-5 w-5 ${isActive ? "text-teal-primary" : "text-slate-medium"
                  }`}
              />
              <span
                className={`text-xs mt-1 ${isActive ? "text-teal-primary" : "text-slate-medium"
                  }`}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
