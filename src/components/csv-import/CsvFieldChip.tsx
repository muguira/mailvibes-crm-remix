import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface CsvFieldChipProps {
  id: string;
  label: string;
  isDragging?: boolean;
}

export function CsvFieldChip({ id, label, isDragging }: CsvFieldChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingInternal,
  } = useDraggable({ id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Hide the original element when being dragged
  const isCurrentlyDragging = isDragging || isDraggingInternal;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isCurrentlyDragging ? 0 : 1,
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md cursor-move",
        "hover:shadow-sm transition-shadow",
        "touch-none" // Prevents touch scrolling interference
      )}
      {...attributes}
      {...listeners}
    >
      <div className="text-gray-400">
        <GripVertical size={16} />
      </div>
      <span className="text-sm text-gray-700 select-none">{label}</span>
    </div>
  );
} 