
import { Check, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnType } from "./grid-view";
import { formatUrl, isValidUrl } from "./grid-utils";
import { usePopover } from "@/hooks/use-popover";
import { GridDatePicker } from "./grid-date-picker";
import { GridSelectDropdown } from "./grid-select-dropdown";
import { useEffect, useState } from "react";

interface GridCellProps {
  rowId: string;
  colKey: string;
  value: any;
  type: ColumnType;
  isActive: boolean;
  isEditable: boolean;
  showSaveIndicator: boolean;
  options?: string[];
  onCellClick: (rowId: string, colKey: string, type: ColumnType, options?: string[]) => void;
  onCellChange: (rowId: string, colKey: string, value: any, type: ColumnType) => void;
}

export function GridCell({
  rowId,
  colKey,
  value,
  type,
  isActive,
  isEditable,
  showSaveIndicator,
  options,
  onCellClick,
  onCellChange
}: GridCellProps) {
  // Store original value for reverting on cancel
  const [originalValue, setOriginalValue] = useState(value);
  
  // For date picker
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (value && type === 'date') {
      try {
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date : undefined;
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  });

  // Initialize popover hook
  const {
    isOpen,
    position,
    popoverType,
    popoverRef,
    openPopover,
    closePopover
  } = usePopover({
    onClose: () => {
      // Revert to original value on close without save
      if (type === 'date' || type === 'status' || type === 'select') {
        // Don't trigger a change, just reset UI state
      }
    },
  });

  // Update original value when prop changes
  useEffect(() => {
    setOriginalValue(value);
    // Also update the date if it's a date cell
    if (type === 'date' && value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        }
      } catch (e) {
        setSelectedDate(undefined);
      }
    }
  }, [value, type]);

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditable) return;
    
    // Handle checkbox toggle directly
    if (type === 'checkbox') {
      onCellChange(rowId, colKey, !value, type);
      return;
    }

    // Handle URL click (open link in new tab)
    if (type === 'url' && value && isValidUrl(value)) {
      if (!isActive) {
        window.open(value, "_blank");
        return;
      }
    }

    // For status or select type, open the dropdown
    if ((type === 'status' || type === 'select') && options && options.length > 0) {
      const cellElement = e.currentTarget as HTMLElement;
      openPopover(cellElement, 'select');
      return;
    }

    // For date type, open the date picker
    if (type === 'date') {
      const cellElement = e.currentTarget as HTMLElement;
      openPopover(cellElement, 'date');
      return;
    }

    // For other types, activate the cell for direct editing
    onCellClick(rowId, colKey, type, options);
  };

  const handleSelectOption = (optionValue: string) => {
    onCellChange(rowId, colKey, optionValue, type);
    // After cell change, close the popover
    closePopover();
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      onCellChange(rowId, colKey, formattedDate, type);
      // After cell change, close the popover
      closePopover();
    }
  };

  return (
    <div
      className={`grid-cell ${isActive ? 'bg-blue-50' : ''} ${
        type === 'currency' ? 'text-right' : ''
      } ${colKey === "opportunity" ? "opportunity-cell" : ""} relative ${type === 'url' && value ? 'text-teal-primary hover:underline cursor-pointer' : ''}`}
      onClick={handleClick}
      tabIndex={isEditable ? 0 : undefined}
      data-cell={`${rowId}-${colKey}`}
    >
      {isActive ? (
        <input
          type={type === 'number' || type === 'currency' ? 'number' : 'text'}
          className="w-full bg-transparent outline-none"
          defaultValue={type === 'currency' ? value?.replace(/[^0-9.-]+/g, '') : value}
          autoFocus
          onBlur={(e) => onCellChange(rowId, colKey, e.target.value, type)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onCellChange(rowId, colKey, e.currentTarget.value, type);
            } else if (e.key === 'Escape') {
              onCellClick("", "", "text"); // Reset active cell
            }
          }}
        />
      ) : type === 'status' ? (
        <span className={`status-pill ${
          value === 'Deal Won' ? 'status-won' : 
          value === 'Qualified' ? 'status-qualified' : 
          value === 'In Procurement' ? 'status-procurement' :
          value === 'Contract Sent' ? 'status-sent' :
          value === 'Discovered' ? 'status-discovered' :
          'status-other'
        }`}>
          {value}
        </span>
      ) : type === 'checkbox' ? (
        <div className="flex justify-center">
          <Checkbox
            checked={!!value}
            onCheckedChange={() => handleClick}
          />
        </div>
      ) : type === 'url' && value ? (
        <div className="flex items-center">
          <span>{value}</span>
          <ExternalLink size={14} className="ml-1" />
        </div>
      ) : (
        <span>{value}</span>
      )}
      
      {/* Save indicator */}
      {showSaveIndicator && (
        <div className="save-indicator">
          <Check size={16} />
        </div>
      )}

      {/* Date picker popover */}
      {popoverType === 'date' && (
        <GridDatePicker
          isOpen={isOpen && popoverType === 'date'}
          position={position}
          selectedDate={selectedDate}
          onClose={closePopover}
          onSelect={handleDateSelect}
          popoverRef={popoverRef}
        />
      )}

      {/* Select dropdown popover */}
      {popoverType === 'select' && options && (
        <GridSelectDropdown
          isOpen={isOpen && popoverType === 'select'}
          position={position}
          options={options}
          onSelect={handleSelectOption}
          onClose={closePopover}
          popoverRef={popoverRef}
        />
      )}
    </div>
  );
}
