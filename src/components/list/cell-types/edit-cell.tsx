
import React from "react";
import { ColumnType } from "../grid-view";

interface EditCellProps {
  value: any;
  type: ColumnType;
  onBlur: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function EditCell({ value, type, onBlur, onKeyDown }: EditCellProps) {
  const inputValue = type === 'currency' ? value?.replace(/[^0-9.-]+/g, '') : value;
  
  return (
    <input
      type={type === 'number' || type === 'currency' ? 'number' : 'text'}
      className="w-full h-full bg-transparent outline-none border-none m-0 p-0"
      defaultValue={inputValue}
      autoFocus
      onBlur={(e) => onBlur(e.target.value)}
      onKeyDown={onKeyDown}
      style={{ lineHeight: '40px' }} // Match the height of the cell
    />
  );
}
