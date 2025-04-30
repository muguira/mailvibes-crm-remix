
import { AbsolutePopoverContent } from "@/components/ui/popover";
import React from "react";

interface SelectDropdownProps {
  isOpen: boolean;
  position: { top: number; left: number };
  options: string[];
  onSelect: (value: string) => void;
  onClose?: () => void;
  popoverRef?: React.RefObject<HTMLDivElement>;
}

export function GridSelectDropdown({
  isOpen,
  position,
  options,
  onSelect,
  onClose,
  popoverRef
}: SelectDropdownProps) {
  if (!isOpen) return null;

  const handleSelect = (option: string) => {
    onSelect(option);
  };

  return (
    <AbsolutePopoverContent
      ref={popoverRef}
      position={position}
      className="w-48 py-1 bg-white border border-slate-200 shadow-lg rounded-md option-menu z-[1200]"
    >
      <div className="overflow-y-auto max-h-[240px]">
        {options.map((option) => (
          <button
            key={option}
            className="option-item w-full text-left px-4 py-2 text-sm hover:bg-slate-100 block"
            onClick={() => handleSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </AbsolutePopoverContent>
  );
}
