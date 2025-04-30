
import { useState } from "react";
import { ColumnType } from "./grid/types";
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
  options?: string[];
  isActive: boolean;
  onClick: () => void;
  onChange: (value: any) => void;
  showSaveIndicator?: boolean;
}

export function GridCell({
  rowId,
  colKey,
  value,
  type,
  options,
  isActive,
  onClick,
  onChange,
  showSaveIndicator = false
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
    isEditable: true,
    type,
    value,
    isActive,
    rowId,
    colKey,
    options,
    onCellChange: onChange,
    onCellClick: onClick,
    openPopover: (element, type) => {
      // Calculate position relative to the cell
      const rect = element.getBoundingClientRect();
      const cellPosition = {
        top: rect.top,
        left: rect.left
      };
      openPopover(element, type);
    }
  });

  // Initialize key handler
  const { handleKeyDown } = useCellKeyHandler({
    rowId,
    colKey,
    type,
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
    }
  };

  const renderCellContent = () => {
    if (isActive) {
      return (
        <EditCell 
          value={value} 
          type={type} 
          onBlur={(value) => onChange(value)}
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

  return (
    <div
      className={`grid-cell ${isActive ? 'active-cell' : ''} ${
        type === 'currency' ? 'text-right' : ''
      } ${colKey === "opportunity" ? "opportunity-cell" : ""}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-cell={`${rowId}-${colKey}`}
      data-row={rowId}
      data-col={colKey}
      aria-selected={isActive}
    >
      {renderCellContent()}
      
      {showSaveIndicator && (
        <SaveIndicator show={true} />
      )}

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
