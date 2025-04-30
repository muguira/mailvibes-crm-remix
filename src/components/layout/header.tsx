
import { Bell, Search, HelpCircle, Settings } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import { ProfileMenu } from "./profile-menu";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-light/30 h-16 flex items-center px-4 justify-between shadow-sm">
      <div className="flex items-center">
        {title && title !== "SalesIQ Dashboard" && title !== "SalesIQ Report" && (
          <h1 className="text-xl font-semibold text-navy-deep">
            {title}
          </h1>
        )}
      </div>

      <div className="flex-1 max-w-lg mx-auto">
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-full bg-slate-light/20 border border-slate-light/40 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-primary/30 focus:border-teal-primary"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-medium h-4 w-4" />
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button className="p-2 rounded-full hover:bg-slate-light/30 text-slate-dark">
          <HelpCircle className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-full hover:bg-slate-light/30 text-slate-dark">
          <Bell className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-full hover:bg-slate-light/30 text-slate-dark">
          <Settings className="h-5 w-5" />
        </button>
        
        <div className="ml-2 border-l border-slate-light/50 pl-2">
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
