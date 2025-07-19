import React, { useRef, useEffect, useState } from 'react';
import { Copy, Clipboard as Paste, ChevronLeft, ChevronRight, Trash2, ArrowDown, ArrowUp, EyeOff, Eye } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  columnId: string;
  columnIndex: number;
  onClose: () => void;
  onCopy: (columnId: string) => void;
  onPaste: (columnId: string) => void;
  onInsertLeft: (columnIndex: number) => void;
  onInsertRight: (columnIndex: number) => void;
  onDelete: (columnId: string) => void;
  onHide?: (columnId: string) => void;
  onShow?: (columnId: string) => void; // New: Function to show column permanently
  onSortAZ: (columnId: string) => void;
  onSortZA: (columnId: string) => void;
  isVisible: boolean;
  isTemporarilyVisible?: boolean; // New: Flag for columns shown by Hidden Columns filter
}

export function ContextMenu({
  x,
  y,
  columnId,
  columnIndex,
  onClose,
  onCopy,
  onPaste,
  onInsertLeft,
  onInsertRight,
  onDelete,
  onHide,
  onShow,
  onSortAZ,
  onSortZA,
  isVisible,
  isTemporarilyVisible = false
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y });

  // Calculate proper menu position to avoid overflow
  useEffect(() => {
    if (menuRef.current) {
      const menuWidth = menuRef.current.offsetWidth;
      const windowWidth = window.innerWidth;
      
      // If menu would overflow the right edge of the screen
      if (x + menuWidth > windowWidth) {
        // Position the menu to the left of the click point
        setAdjustedPosition({
          x: Math.max(windowWidth - menuWidth - 20, 0), // 20px padding from right edge
          y
        });
      } else {
        setAdjustedPosition({ x, y });
      }
    }
  }, [x, y, isVisible]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div 
      ref={menuRef}
      className="fixed z-[1000] bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden w-60"
      style={{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-1 py-1">
        <button 
          className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          onClick={() => { onCopy(columnId); onClose(); }}
        >
          <Copy size={16} className="mr-2 text-gray-500" />
          <span>Copy</span>
          <div className="ml-auto text-xs text-gray-500">⌘C</div>
        </button>
        
        <button 
          className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          onClick={() => { onPaste(columnId); onClose(); }}
        >
          <Paste size={16} className="mr-2 text-gray-500" />
          <span>Paste</span>
          <div className="ml-auto text-xs text-gray-500">⌘V</div>
        </button>
      </div>
      
      <div className="border-t border-gray-200 my-1"></div>
      
      <div className="px-1 py-1">
        <button 
          className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          onClick={() => { onInsertLeft(columnIndex); onClose(); }}
        >
          <ChevronLeft size={16} className="mr-2 text-gray-500" />
          <span>➕ Insert column left</span>
        </button>
        
        {/* Only show Insert column right if not on Last Contacted column */}
        {columnId !== 'lastContacted' && (
          <button 
            className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={() => { onInsertRight(columnIndex); onClose(); }}
          >
            <ChevronRight size={16} className="mr-2 text-gray-500" />
            <span>➕ Insert column right</span>
          </button>
        )}
        
        <button 
          className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          onClick={() => { onDelete(columnId); onClose(); }}
        >
          <Trash2 size={16} className="mr-2 text-gray-500" />
          <span>Delete column</span>
        </button>
        
        {(onHide || onShow) && (
          <button 
            className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={() => { 
              console.log('🟡 [CONTEXT MENU] Hide/Show button clicked:', {
                columnId,
                isTemporarilyVisible,
                hasOnShow: !!onShow,
                hasOnHide: !!onHide,
                action: isTemporarilyVisible ? 'show' : 'hide',
                timestamp: new Date().toISOString()
              });
              
              if (isTemporarilyVisible && onShow) {
                console.log('🟡 [CONTEXT MENU] Calling onShow for columnId:', columnId);
                onShow(columnId); // Show permanently
              } else if (onHide) {
                console.log('🟡 [CONTEXT MENU] Calling onHide for columnId:', columnId);
                onHide(columnId); // Hide column
              }
              onClose(); 
            }}
          >
            {isTemporarilyVisible ? (
              <>
                <Eye size={16} className="mr-2 text-gray-500" />
                <span>Show column</span>
              </>
            ) : (
              <>
                <EyeOff size={16} className="mr-2 text-gray-500" />
                <span>Hide this column</span>
              </>
            )}
          </button>
        )}
      </div>
      
      <div className="border-t border-gray-200 my-1"></div>
      
      <div className="px-1 py-1">
        <button 
          className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          onClick={() => { onSortAZ(columnId); onClose(); }}
        >
          <ArrowDown size={16} className="mr-2 text-gray-500" />
          <span>A→Z Sort sheet A to Z</span>
        </button>
        
        <button 
          className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          onClick={() => { onSortZA(columnId); onClose(); }}
        >
          <ArrowUp size={16} className="mr-2 text-gray-500" />
          <span>Z→A Sort sheet Z to A</span>
        </button>
      </div>
    </div>
  );
} 