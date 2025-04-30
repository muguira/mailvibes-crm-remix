
import { X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { CustomButton } from "@/components/ui/custom-button";

interface DatePickerProps {
  isOpen: boolean;
  position: { top: number; left: number };
  selectedDate: Date | undefined;
  onClose: () => void;
  onSelect: (date: Date | undefined) => void;
}

export function GridDatePicker({
  isOpen,
  position,
  selectedDate,
  onClose,
  onSelect
}: DatePickerProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed bg-white shadow-lg rounded-md z-50 border border-slate-200 calendar-popup"
      style={{
        top: position.top + 'px',
        left: position.left + 'px',
      }}
    >
      <div className="header">
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
        onSelect={(date) => onSelect(date)}
        initialFocus
        className="p-3 pointer-events-auto"
      />
      <div className="footer">
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
    </div>
  );
}
