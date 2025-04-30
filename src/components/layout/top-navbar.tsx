
import { NavLink } from "react-router-dom";
import { Bell, Settings, HelpCircle, Search, User } from "lucide-react";
import { ProfileMenu } from "./profile-menu";

export function TopNavbar() {
  return (
    <div className="bg-[#054258] text-white w-full">
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
          <NavLink to="/" className="px-4 h-12 flex items-center hover:bg-[#2D7289]/50">
            Home
          </NavLink>
          <NavLink to="/reports" className="px-4 h-12 flex items-center hover:bg-[#2D7289]/50">
            Reports
          </NavLink>
          <NavLink to="/leads" className="px-4 h-12 flex items-center hover:bg-[#2D7289]/50">
            Leads
          </NavLink>
          <NavLink 
            to="/lists" 
            className={({ isActive }) => 
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 ${isActive ? 'bg-[#2D7289]/50' : ''}`
            }
          >
            Opportunities
          </NavLink>
          <NavLink to="/customers" className="px-4 h-12 flex items-center hover:bg-[#2D7289]/50">
            Customers
          </NavLink>
        </div>

        {/* Right side icons */}
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
