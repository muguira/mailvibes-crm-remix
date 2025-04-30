
import { X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
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
    // Force close the popup after selection
    onClose();
  };

  // Ensure calendar has a default date if none is selected
  // This prevents it from getting "stuck" on a specific day
  const defaultDate = selectedDate || new Date();

  return (
    <AbsolutePopoverContent
      ref={popoverRef}
      position={position}
      className="calendar-popup z-[1200]"
    >
      <div className="header p-3 border-b flex justify-between items-center">
        <span className="text-sm font-medium">Select Date</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center"
          type="button"
        >
          <X size={14} />
        </button>
      </div>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleSelect}
        defaultMonth={defaultDate}
        initialFocus
        className="p-3 pointer-events-auto"
      />
    </AbsolutePopoverContent>
  );
}
