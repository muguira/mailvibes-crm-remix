
import { Check, ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnType } from "./grid-view";
import { formatUrl, isValidUrl } from "./grid-utils";

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
  const handleClick = () => {
    if (isEditable) {
      onCellClick(rowId, colKey, type, options);
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
            onCheckedChange={() => handleClick()}
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
    </div>
  );
}
