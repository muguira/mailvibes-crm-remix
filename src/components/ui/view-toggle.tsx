import React from 'react';
import { Button } from "@/components/ui/button";
import { List, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = 'list' | 'board';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ currentView, onViewChange, className }: ViewToggleProps) {
  const isListView = currentView === 'list';
  const isBoardView = currentView === 'board';

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {/* List View Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewChange('list')}
        className={cn(
          "w-9 h-9 p-0 bg-white hover:bg-gray-50 transition-all duration-200",
          isListView 
            ? "border-[#32BAB0] text-[#32BAB0]"
            : "border-gray-300 text-gray-600 hover:border-[#32BAB0] hover:text-[#32BAB0]"
        )}
        title="List View"
      >
        <List className="h-4 w-4" />
      </Button>

      {/* Board View Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewChange('board')}
        className={cn(
          "w-9 h-9 p-0 bg-white hover:bg-gray-50 transition-all duration-200",
          isBoardView 
            ? "border-[#32BAB0] text-[#32BAB0]"
            : "border-gray-300 text-gray-600 hover:border-[#32BAB0] hover:text-[#32BAB0]"
        )}
        title="Board View"
      >
        <Columns3 className="h-4 w-4" />
      </Button>
    </div>
  );
} 