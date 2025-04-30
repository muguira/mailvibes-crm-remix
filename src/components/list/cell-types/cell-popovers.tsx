
import { GridDatePicker } from "../grid-date-picker";
import { GridSelectDropdown } from "../grid-select-dropdown";
import { PopoverType } from "@/hooks/use-popover";

interface CellPopoversProps {
  isOpen: boolean;
  position: { top: number; left: number };
  popoverType: PopoverType;
  selectedDate?: Date;
  options?: string[];
  popoverRef: React.RefObject<HTMLDivElement>;
  onClose: () => void;
  onDateSelect: (date: Date | undefined) => void;
  onOptionSelect: (option: string) => void;
}

export function CellPopovers({
  isOpen,
  position,
  popoverType,
  selectedDate,
  options,
  popoverRef,
  onClose,
  onDateSelect,
  onOptionSelect
}: CellPopoversProps) {
  return (
    <>
      {/* Date picker popover */}
      <GridDatePicker
        isOpen={isOpen && popoverType === 'date'}
        position={position}
        selectedDate={selectedDate}
        onClose={onClose}
        onSelect={onDateSelect}
        popoverRef={popoverRef}
      />

      {/* Select dropdown popover */}
      {options && (
        <GridSelectDropdown
          isOpen={isOpen && popoverType === 'select'}
          position={position}
          options={options}
          onSelect={onOptionSelect}
          onClose={onClose}
          popoverRef={popoverRef}
        />
      )}
    </>
  );
}
