import React from 'react';
import { Copy, ClipboardPaste, ChevronLeft, ChevronRight, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface ContextMenuProps {
  x: number;
  y: number;
  columnId: string;
  onClose: () => void;
  onCopy: (columnId: string) => void;
  onPaste: (columnId: string) => void;
  onInsertLeft: (columnId: string) => void;
  onInsertRight: (columnId: string) => void;
  onDelete: (columnId: string) => void;
  onSortAZ: (columnId: string) => void;
  onSortZA: (columnId: string) => void;
  isVisible: boolean;
}

export function ContextMenu({
  x,
  y,
  columnId,
  onClose,
  onCopy,
  onPaste,
  onInsertLeft,
  onInsertRight,
  onDelete,
  onSortAZ,
  onSortZA,
  isVisible
}: ContextMenuProps) {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed z-50 context-menu-container"
      style={{ left: x, top: y }}
    >
      <DropdownMenu open={isVisible} onOpenChange={(open) => !open && onClose()}>
        <DropdownMenuContent className="w-44 min-w-[180px]">
          <DropdownMenuItem onClick={() => { onCopy(columnId); onClose(); }}>
            <Copy size={16} className="mr-2" />
            <span>Copy</span>
            <div className="ml-auto text-xs text-muted-foreground">⌘C</div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => { onPaste(columnId); onClose(); }}>
            <ClipboardPaste size={16} className="mr-2" />
            <span>Paste</span>
            <div className="ml-auto text-xs text-muted-foreground">⌘V</div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => { onInsertLeft(columnId); onClose(); }}>
            <ChevronLeft size={16} className="mr-2" />
            <span>Insert column left</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => { onInsertRight(columnId); onClose(); }}>
            <ChevronRight size={16} className="mr-2" />
            <span>Insert column right</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => { onDelete(columnId); onClose(); }}>
            <Trash2 size={16} className="mr-2" />
            <span>Delete column</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => { onSortAZ(columnId); onClose(); }}>
            <ArrowDown size={16} className="mr-2" />
            <span>A→Z Sort sheet A to Z</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => { onSortZA(columnId); onClose(); }}>
            <ArrowUp size={16} className="mr-2" />
            <span>Z→A Sort sheet Z to A</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 