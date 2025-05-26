import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface AccountPropertySlotProps {
  id: string;
  label: string;
  required?: boolean;
  value?: string;
  children?: React.ReactNode;
  onClear?: () => void;
  showListFieldCheckbox?: boolean;
  isListFieldChecked?: boolean;
  onListFieldToggle?: (checked: boolean) => void;
}

export function AccountPropertySlot({
  id,
  label,
  required,
  value,
  children,
  onClear,
  showListFieldCheckbox = true,
  isListFieldChecked = false,
  onListFieldToggle,
}: AccountPropertySlotProps) {
  // Determine if the slot has content (either value or children)
  const hasContent = value || children;

  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: !!hasContent, // Disable droppable when slot already has content
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
        {required && (
          <span className="text-xs text-red-500">*Required</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div
          ref={setNodeRef}
          className={cn(
            "relative min-h-[40px] rounded-md transition-all flex-1",
            hasContent
              ? "bg-gray-50 border border-gray-200"
              : "border-2 border-dashed border-gray-300",
            isOver && !hasContent && "border-[#62BFAA] bg-[#62BFAA]/5"
          )}
        >
          {/* Show + icon when hovering with a draggable */}
          {isOver && !hasContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-[#62BFAA] text-white rounded-full p-1">
                <Plus size={20} />
              </div>
            </div>
          )}

          {/* Show the mapped field or children */}
          {hasContent && (
            <div className="px-3 py-2 flex items-center justify-between">
              {children || (
                <span className="text-sm text-gray-700">{value}</span>
              )}
              {onClear && (
                <button
                  onClick={onClear}
                  className="text-gray-400 hover:text-gray-600 text-sm ml-2"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {!hasContent && !isOver && (
            <div className="px-3 py-2 pointer-events-none">
              <span className="text-sm text-gray-400">
                Drag a field here
              </span>
            </div>
          )}
        </div>

        {/* List field checkbox - now on the same line */}
        {showListFieldCheckbox && hasContent && (
          <Checkbox
            id={`${id}-list-field`}
            checked={isListFieldChecked}
            onCheckedChange={onListFieldToggle}
            className="data-[state=checked]:bg-[#62BFAA] data-[state=checked]:border-[#62BFAA]"
          />
        )}
      </div>
    </div>
  );
} 