import { NavLink } from "react-router-dom";
import { Bell, Settings, HelpCircle, Search } from "lucide-react";
import { ProfileMenu } from "./profile-menu";
import { cn } from "@/lib/utils";

interface TopNavbarProps {
  className?: string;
}

export function TopNavbar({ className }: TopNavbarProps) {
  return (
    <div className={cn("bg-[#054258] text-white w-full fixed top-0 left-0 right-0 z-[10000]", className)}>
      <div className="flex items-center h-12">
        {/* Logo - replaced circle with plain SVG logo */}
        <div className="flex items-center px-4">
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/e748aec3-e452-4ebc-b84b-7a48e19480be.png" 
              alt="" 
              className="h-6 w-auto" 
            />
            <span className="sr-only">SalesIQ Home</span>
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

        {/* Right side icons with gap-4 and flush right */}
        <div className="ml-auto flex items-center gap-4 pr-4">
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
