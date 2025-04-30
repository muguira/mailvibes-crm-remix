
import { X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { CustomButton } from "@/components/ui/custom-button";
import { AbsolutePopoverContent } from "@/components/ui/popover";

interface DatePickerProps {
  isOpen: boolean;
  position: { top: number; left: number };
  selectedDate: Date | undefined;
  onClose: () => void;
  onSelect: (date: Date | undefined) => void;
  popoverRef?: React.RefObject<HTMLDivElement>;
}

export function GridDatePicker({
  isOpen,
  position,
  selectedDate,
  onClose,
  onSelect,
  popoverRef
}: DatePickerProps) {
  if (!isOpen) return null;

  const handleSelect = (date: Date | undefined) => {
    onSelect(date);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSelect(selectedDate);
    }
  };

  return (
    <AbsolutePopoverContent
      ref={popoverRef}
      position={position}
      className="calendar-popup"
      onKeyDown={handleKeyDown}
    >
      <div className="header p-3 border-b flex justify-between items-center">
        <span className="text-sm font-medium">Select Date</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center"
        >
          <X size={14} />
        </button>
      </div>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => handleSelect(date)}
        initialFocus
        className="p-3 pointer-events-auto"
      />
      <div className="footer p-3 border-t flex justify-end space-x-2">
        <CustomButton
          variant="outline"
          size="sm"
          className="mr-2"
          onClick={onClose}
        >
          Cancel
        </CustomButton>
        <CustomButton
          variant="default"
          size="sm"
          onClick={() => onSelect(selectedDate)}
        >
          Apply
        </CustomButton>
      </div>
    </AbsolutePopoverContent>
  );
}
