
import React from "react";
import { Grid, List } from "lucide-react";

interface ViewModeSelectorProps {
  viewMode: "grid" | "stream";
  onViewModeChange: (mode: "grid" | "stream") => void;
}

export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <div className="flex bg-white/20 rounded overflow-hidden">
      <button 
        className={`flex items-center justify-center p-1 w-8 h-8 ${viewMode === "grid" ? "bg-white text-salesforce-mint" : "text-white"}`}
        onClick={() => onViewModeChange("grid")}
        aria-label="Grid View"
      >
        <Grid size={16} />
      </button>
      <button 
        className={`flex items-center justify-center p-1 w-8 h-8 ${viewMode === "stream" ? "bg-white text-salesforce-mint" : "text-white"}`}
        onClick={() => onViewModeChange("stream")}
        aria-label="Stream View"
      >
        <List size={16} />
      </button>
    </div>
  );
}
