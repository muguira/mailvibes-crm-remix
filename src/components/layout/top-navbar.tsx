import { NavLink } from "react-router-dom";
import { Bell, Settings, HelpCircle, Search, User } from "lucide-react";
import { ProfileMenu } from "./profile-menu";
import { cn } from "@/lib/utils";

interface TopNavbarProps {
  className?: string;
}

export function TopNavbar({ className }: TopNavbarProps) {
  return (
    <div className={cn("bg-[#054258] text-white w-full", className)}>
      <div className="flex items-center h-12">
        {/* Logo */}
        <div className="flex items-center px-4">
          <div className="h-8 w-8 rounded-full bg-teal-primary/20 flex items-center justify-center text-lg font-bold text-teal-primary">
            S
          </div>
          <span className="ml-2 font-semibold text-lg">SalesIQ</span>
        </div>

        {/* Navigation Items */}
        <div className="flex">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
            }
          >
            Reports
          </NavLink>
          <NavLink
            to="/leads"
            className={({ isActive }) =>
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
            }
          >
            Leads
          </NavLink>
          <NavLink
            to="/lists"
            className={({ isActive }) =>
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
            }
          >
            Opportunities
          </NavLink>
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
            }
          >
            Customers
          </NavLink>
        </div>

        {/* Right side icons - ensure ml-auto is applied here */}
        <div className="ml-auto flex items-center pr-4">
          <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
            <Bell size={18} />
          </button>
          <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
            <HelpCircle size={18} />
          </button>
          <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
            <Settings size={18} />
          </button>
          <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
            <Search size={18} />
          </button>
          <ProfileMenu />
        </div>
      </div>
    </div>
  );
}
