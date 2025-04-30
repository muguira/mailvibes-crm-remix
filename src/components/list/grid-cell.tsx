
import { useState } from "react";
import { ColumnType } from "./grid-view";
import { usePopover } from "@/hooks/use-popover";
import { SaveIndicator } from "./save-indicator";
import { useCellDatePicker } from "@/hooks/use-cell-date-picker";
import { useCellClickHandler } from "./cell-types/cell-click-handler";
import { useCellKeyHandler } from "./cell-types/cell-key-handler";
import { CellPopovers } from "./cell-types/cell-popovers";
import { CheckboxCell, UrlCell, StatusCell, TextCell, EditCell } from "./cell-types";

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
  
  // Initialize date picker hook
  const { selectedDate } = useCellDatePicker(value, type);
  
  // Initialize popover hook
  const {
    isOpen,
    position,
    popoverType,
    popoverRef,
    openPopover,
    closePopover
  } = usePopover();

  // Update original value when prop changes
  useState(() => {
    setOriginalValue(value);
  });

  // Initialize click handler
  const { handleClick } = useCellClickHandler({
    isEditable,
    type,
    value,
    isActive,
    rowId,
    colKey,
    options,
    onCellChange,
    onCellClick,
    openPopover
  });

  // Initialize key handler
  const { handleKeyDown } = useCellKeyHandler({
    rowId,
    colKey,
    type,
    onCellChange,
    onCellClick
  });

  const handleSelectOption = (optionValue: string) => {
    onCellChange(rowId, colKey, optionValue, type);
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
      // The closePopover is now handled inside the DatePicker component
    }
  };

  const renderCellContent = () => {
    if (isActive) {
      return (
        <EditCell 
          value={value} 
          type={type} 
          onBlur={(value) => onCellChange(rowId, colKey, value, type)}
          onKeyDown={handleKeyDown}
        />
      );
    }

    switch (type) {
      case 'status':
        return <StatusCell value={value} />;
      case 'checkbox':
        return (
          <CheckboxCell
            value={!!value}
            onToggle={() => handleClick({ currentTarget: null } as React.MouseEvent)}
          />
        );
      case 'url':
        return value ? <UrlCell value={value} /> : null;
      default:
        return <TextCell value={value} />;
    }
  };

  // Create the appropriate cell class name - maintain consistent sizing regardless of active state
  const cellClassName = `grid-cell ${
    type === 'currency' ? 'text-right' : ''
  } ${colKey === "opportunity" ? "opportunity-cell" : ""} relative ${type === 'url' && value ? 'text-teal-primary hover:underline cursor-pointer' : ''}`;

  return (
    <div
      className={cellClassName}
      onClick={handleClick}
      tabIndex={isEditable ? 0 : undefined}
      data-cell={`${rowId}-${colKey}`}
      data-active={isActive ? "true" : "false"}
    >
      {renderCellContent()}
      
      <SaveIndicator show={showSaveIndicator} />

      <CellPopovers
        isOpen={isOpen}
        position={position}
        popoverType={popoverType}
        selectedDate={selectedDate}
        options={options}
        popoverRef={popoverRef}
        onClose={closePopover}
        onDateSelect={handleDateSelect}
        onOptionSelect={handleSelectOption}
      />
    </div>
  );
}
