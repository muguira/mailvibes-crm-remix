import { NavLink } from "react-router-dom";
import { Bell, Settings, HelpCircle, Search } from "lucide-react";
import { ProfileMenu } from "./profile-menu";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface TopNavbarProps {
  className?: string;
}

export function TopNavbar({ className }: TopNavbarProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices based on screen width
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={cn("bg-[#054258] text-white w-full fixed top-0 left-0 right-0 z-[10000]", className)}>
      <div className="flex items-center h-12">
        {/* Logo - replaced with $ emoji on mobile */}
        <div className="flex items-center px-4">
          {isMobile ? (
            <span className="font-bold text-lg text-[#32BAB0]">$</span>
          ) : (
            <span className="font-semibold text-lg">SalesIQ</span>
          )}
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
          
          {/* Only show Reports on desktop */}
          {!isMobile && (
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
              }
            >
              Reports
            </NavLink>
          )}
          
          <NavLink
            to="/leads"
            className={({ isActive }) =>
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
            }
          >
            Contacts
          </NavLink>
          
          <NavLink
            to="/lists"
            className={({ isActive }) =>
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
            }
          >
            Opportunities
          </NavLink>
          
          {/* Only show Customers on desktop */}
          {!isMobile && (
            <NavLink
              to="/customers"
              className={({ isActive }) =>
                `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
              }
            >
              Customers
            </NavLink>
          )}
        </div>

        {/* Right side icons with gap-4 and flush right */}
        <div className="ml-auto flex items-center gap-4 pr-4">
          {/* Notification bell - always visible */}
          <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
            <Bell size={18} />
          </button>
          
          {/* Only show Help and Settings on desktop */}
          {!isMobile && (
            <>
              <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
                <HelpCircle size={18} />
              </button>
              <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
                <Settings size={18} />
              </button>
            </>
          )}
          
          {/* Search button - only on desktop */}
          {!isMobile && (
            <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
              <Search size={18} />
            </button>
          )}
          
          {/* Profile menu - always positioned at the far right */}
          <ProfileMenu />
        </div>
      </div>
    </div>
  );
}
