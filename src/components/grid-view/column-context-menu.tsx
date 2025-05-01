
import React from 'react';
import {
  Copy,
  Clipboard,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnContextMenuProps {
  columnId: string;
  isOpportunity?: boolean; // Prevent deletion of opportunity column
  trigger?: React.ReactNode;
  onCopyColumn?: (columnId: string) => void;
  onPasteColumn?: (columnId: string) => void;
  onInsertColumnLeft?: (columnId: string) => void;
  onInsertColumnRight?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onSortAZ?: (columnId: string) => void;
  onSortZA?: (columnId: string) => void;
}

export const ColumnContextMenu: React.FC<ColumnContextMenuProps> = ({
  columnId,
  isOpportunity = false,
  trigger,
  onCopyColumn,
  onPasteColumn,
  onInsertColumnLeft,
  onInsertColumnRight,
  onDeleteColumn,
  onSortAZ,
  onSortZA,
}) => {
  const handleAction = (action: (columnId: string) => void | undefined) => {
    return () => {
      if (action) action(columnId);
    };
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || <div className="cursor-pointer">⋮</div>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleAction(onCopyColumn)}>
          <Copy size={14} className="mr-2" />
          Copy
          <span className="ml-auto text-xs text-muted-foreground">⌘C</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleAction(onPasteColumn)}>
          <Clipboard size={14} className="mr-2" />
          Paste
          <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleAction(onInsertColumnLeft)}>
          <Plus size={14} className="mr-2" />
          Insert column left
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleAction(onInsertColumnRight)}>
          <Plus size={14} className="mr-2" />
          Insert column right
        </DropdownMenuItem>

        {!isOpportunity && (
          <DropdownMenuItem onClick={handleAction(onDeleteColumn)}>
            <Trash2 size={14} className="mr-2" />
            Delete column
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleAction(onSortAZ)}>
          <span className="mr-2">A→Z</span>
          Sort sheet A to Z
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleAction(onSortZA)}>
          <span className="mr-2">Z→A</span>
          Sort sheet Z to A
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
