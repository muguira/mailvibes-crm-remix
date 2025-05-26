import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { FieldType } from "@/utils/buildFieldDefinitions";

interface ListFieldSlotProps {
  id: string;
  fieldName: string;
  csvField?: string;
  fieldType?: FieldType;
  required?: boolean;
  onRemove?: () => void;
  isPlaceholder?: boolean;
}

export function ListFieldSlot({
  id,
  fieldName,
  csvField,
  fieldType = "text",
  required,
  onRemove,
  isPlaceholder = false,
}: ListFieldSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: !isPlaceholder && !!csvField,
  });

  if (isPlaceholder) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "relative min-h-[40px] rounded-md transition-all",
          "border-2 border-dashed border-gray-300",
          isOver && "border-[#62BFAA] bg-[#62BFAA]/5"
        )}
      >
        {isOver ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-[#62BFAA] text-white rounded-full p-1">
              <Plus size={20} />
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 flex items-center gap-2 text-gray-500">
            <Plus className="w-5 h-5" />
            <span className="text-sm">Add a Field</span>
          </div>
        )}
      </div>
    );
  }

  // Style matching ContactPropertySlot
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          {fieldName}
        </label>
        {required && (
          <span className="text-xs text-red-500">*Required</span>
        )}
      </div>
      
      <div
        ref={setNodeRef}
        className={cn(
          "relative min-h-[40px] rounded-md transition-all",
          csvField
            ? "bg-gray-50 border border-gray-200"
            : "border-2 border-dashed border-gray-300",
          isOver && !csvField && "border-[#62BFAA] bg-[#62BFAA]/5"
        )}
      >
        {/* Show + icon when hovering with a draggable */}
        {isOver && !csvField && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-[#62BFAA] text-white rounded-full p-1">
              <Plus size={20} />
            </div>
          </div>
        )}

        {/* Show the mapped field */}
        {csvField && (
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-sm text-gray-700">{csvField}</span>
            {onRemove && (
              <button
                onClick={onRemove}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!csvField && !isOver && (
          <div className="px-3 py-2 pointer-events-none">
            <span className="text-sm text-gray-400">
              Drag a field here
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 