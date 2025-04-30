
import React from 'react';

interface SheetMenuProps {
  listName: string;
}

export function SheetMenu({ listName }: SheetMenuProps) {
  return (
    <div className="sheet-style-menu">
      <div className="flex items-center gap-2">
        <span className="font-medium text-navy-deep">{listName || "Untitled List"}</span>
      </div>
      <div className="flex-1"></div>
    </div>
  );
}
