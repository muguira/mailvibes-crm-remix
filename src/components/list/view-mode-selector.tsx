
import React from "react";
import { Grid2x2, LayoutList } from "lucide-react";

interface ViewModeSelectorProps {
  viewMode: "grid" | "stream";
  onViewModeChange: (mode: "grid" | "stream") => void;
}

export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <div className="flex bg-slate-light/20 rounded overflow-hidden">
      <button 
        className={`flex items-center justify-center p-1 w-8 h-8 ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
        onClick={() => onViewModeChange("grid")}
        title="Grid View"
      >
        <Grid2x2 size={16} className={viewMode === "grid" ? "text-teal-primary" : "text-slate-medium"} />
      </button>
      <button 
        className={`flex items-center justify-center p-1 w-8 h-8 ${viewMode === "stream" ? "bg-white shadow-sm" : ""}`}
        onClick={() => onViewModeChange("stream")}
        title="List View"
      >
        <LayoutList size={16} className={viewMode === "stream" ? "text-teal-primary" : "text-slate-medium"} />
      </button>
    </div>
  );
}
