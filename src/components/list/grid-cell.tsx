
import { useState } from "react";
import { ColumnType, ColumnDef } from "./grid/types";
import { usePopover } from "@/hooks/use-popover";
import { SaveIndicator } from "./save-indicator";
import { useCellDatePicker } from "@/hooks/use-cell-date-picker";
import { useCellClickHandler } from "./cell-types/cell-click-handler";
import { useCellKeyHandler } from "./cell-types/cell-key-handler";
import { CellPopovers } from "./cell-types/cell-popovers";
import { CheckboxCell, UrlCell, StatusCell, TextCell, EditCell } from "./cell-types";

interface GridCellProps {
  rowId: string;
  value: any;
  column: ColumnDef;
  isActive: boolean;
  onClick: () => void;
  onChange: (value: any) => void;
}

export function GridCell({
  rowId,
  value,
  column,
  isActive,
  onClick,
  onChange
}: GridCellProps) {
  // Store original value for reverting on cancel
  const [originalValue, setOriginalValue] = useState(value);
  
  // Initialize date picker hook
  const { selectedDate } = useCellDatePicker(value, column.type);
  
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
    isEditable: column.editable !== false,
    type: column.type,
    value,
    isActive,
    rowId,
    colKey: column.key,
    options: column.options,
    onCellChange: onChange,
    onCellClick: onClick,
    openPopover
  });

  // Initialize key handler
  const { handleKeyDown } = useCellKeyHandler({
    rowId,
    colKey: column.key,
    type: column.type,
    onCellChange: onChange,
    onCellClick: onClick
  });

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    closePopover();
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      onChange(formattedDate);
      // The closePopover is now handled inside the DatePicker component
    }
  };

  const renderCellContent = () => {
    if (isActive) {
      return (
        <EditCell 
          value={value} 
          type={column.type} 
          onBlur={(value) => onChange(value)}
          onKeyDown={handleKeyDown}
        />
      );
    }

    switch (column.type) {
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

  return (
    <div
      className={`grid-cell ${isActive ? 'bg-blue-50' : ''} ${
        column.type === 'currency' ? 'text-right' : ''
      } ${column.key === "opportunity" ? "opportunity-cell" : ""} relative ${column.type === 'url' && value ? 'text-teal-primary hover:underline cursor-pointer' : ''}`}
      onClick={handleClick}
      tabIndex={column.editable !== false ? 0 : undefined}
      data-cell={`${rowId}-${column.key}`}
    >
      {renderCellContent()}
      
      <SaveIndicator show={false} />

      <CellPopovers
        isOpen={isOpen}
        position={position}
        popoverType={popoverType}
        selectedDate={selectedDate}
        options={column.options}
        popoverRef={popoverRef}
        onClose={closePopover}
        onDateSelect={handleDateSelect}
        onOptionSelect={handleSelectOption}
      />
    </div>
  );
}
