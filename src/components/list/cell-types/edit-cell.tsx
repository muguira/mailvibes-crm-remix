
import React from "react";
import { ColumnType } from "../grid/types";

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
      className="w-full h-full bg-transparent outline-none"
      defaultValue={inputValue}
      autoFocus
      onBlur={(e) => onBlur(e.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}
