
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Bell, Settings, HelpCircle, Search, User } from "lucide-react";
import { ProfileMenu } from "./profile-menu";

export function TopNavbar() {
  const navItems = [
    { label: "Home", to: "/" },
    { label: "Reports", to: "/reports" },
    { label: "Leads", to: "/leads" },
    { label: "Opportunities", to: "/lists", active: true },
    { label: "Customers", to: "/customers" },
  ];

  return (
    <div className="bg-[#054258] text-white w-full">
      <div className="top-nav-bar">
        {/* Logo */}
        <div className="flex items-center mr-6">
          <div className="h-8 w-8 rounded-full bg-teal-primary/20 flex items-center justify-center text-lg font-bold text-teal-primary">
            S
          </div>
          <span className="ml-2 font-semibold text-lg">SalesIQ</span>
        </div>

        {/* Navigation Items */}
        <div className="flex h-full">
          {navItems.map((item) => (
            <NavLink 
              key={item.label} 
              to={item.to}
              className={({ isActive }) => 
                `top-nav-item ${isActive ? 'active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right side icons */}
        <div className="ml-auto flex items-center space-x-3">
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
