import { NavLink, useLocation } from "react-router-dom";
import { Bell, Settings, HelpCircle, Search } from "lucide-react";
import { ProfileMenu } from "./profile-menu";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface TopNavbarProps {
  className?: string;
}

export function TopNavbar({ className }: TopNavbarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const isDashboardOrAuth = location.pathname === "/" || location.pathname.includes("/auth");

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
        {/* Logo only - no text */}
        <div className="flex items-center px-2">
          <span className="font-bold text-2xl text-[#32BAB0]">$</span>
        </div>

        {/* Navigation Items - moved more to the left */}
        <div className="flex ml-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-4 h-12 flex items-center hover:bg-[#2D7289]/50 border-b-4 ${isActive ? 'border-b-teal-400' : 'border-b-transparent'}`
            }
          >
            Home
          </NavLink>

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
          
          {/* Reports link - completely removed on mobile, now positioned after Customers */}
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
        </div>

        {/* Right side icons with gap-4 and flush right */}
        <div className="ml-auto flex items-center gap-4 pr-4">
          {/* Notification bell - only visible on desktop */}
          {!isMobile && (
          <button className="p-2 rounded-full hover:bg-[#2D7289]/50">
            <Bell size={18} />
          </button>
          )}

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
