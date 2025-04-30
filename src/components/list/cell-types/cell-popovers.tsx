
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
  // Calculate adjusted position to position popover right below the cell
  const adjustedPosition = {
    top: position.top + 32, // Align with bottom of the cell (row height)
    left: position.left,
    zIndex: 9999
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Date picker popover */}
      {popoverType === 'date' && (
        <GridDatePicker
          isOpen={true}
          position={adjustedPosition}
          selectedDate={selectedDate}
          onClose={onClose}
          onSelect={onDateSelect}
          popoverRef={popoverRef}
        />
      )}

      {/* Select dropdown popover */}
      {popoverType === 'select' && options && (
        <GridSelectDropdown
          isOpen={true}
          position={adjustedPosition}
          options={options}
          onSelect={onOptionSelect}
          onClose={onClose}
          popoverRef={popoverRef}
        />
      )}
    </>
  );
}
