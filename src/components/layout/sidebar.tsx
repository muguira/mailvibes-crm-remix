import { useState } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  List,
  BarChart,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Users
} from "lucide-react";

const SidebarItem = ({
  icon: Icon,
  label,
  to,
  collapsed
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  collapsed: boolean;
}) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
          isActive
            ? "bg-teal-primary text-white"
            : "text-white/80 hover:bg-navy-light/50 hover:text-white",
          collapsed && "justify-center"
        )
      }
    >
      <Icon size={20} />
      {!collapsed && <span className="font-medium">{label}</span>}
    </NavLink>
  );
};

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "bg-navy-deep text-white flex flex-col h-screen transition-all duration-300 border-r border-navy-light/20",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo area */}
      <div className="flex items-center p-4 border-b border-navy-light/20">
        {collapsed ? (
          <div className="mx-auto text-teal-primary">
            <span className="text-teal-primary text-2xl font-bold">
              $
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            <span className="text-teal-primary text-2xl font-bold">
              $
            </span>
            <span className="ml-2 font-semibold text-lg">SalesSheets</span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          <SidebarItem icon={Home} label="Home" to="/" collapsed={collapsed} />
          <SidebarItem icon={List} label="Lists" to="/lists" collapsed={collapsed} />
          <SidebarItem icon={BarChart} label="Reports" to="/reports" collapsed={collapsed} />
          <SidebarItem icon={Users} label="Contacts" to="/leads" collapsed={collapsed} />
        </nav>
      </div>

      {/* Bottom section */}
      <div className="border-t border-gray-200 p-4">
        <nav className="space-y-1">
          <SidebarItem icon={Settings} label="Settings" to="/profile" collapsed={collapsed} />
          <SidebarItem icon={Bell} label="Notifications" to="/notifications" collapsed={collapsed} />
          <SidebarItem icon={HelpCircle} label="Help" to="/help" collapsed={collapsed} />
        </nav>
      </div>

      {/* Toggle collapse button */}
      <div className="p-4 border-t border-navy-light/20">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-md hover:bg-navy-light/30 text-white/70 hover:text-white"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </div>
  );
}
