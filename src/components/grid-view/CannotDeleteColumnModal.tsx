import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EyeOff, X } from 'lucide-react';

interface CannotDeleteColumnModalProps {
  isOpen: boolean;
  columnName: string;
  onHideColumn: () => void;
  onCancel: () => void;
}

export function CannotDeleteColumnModal({
  isOpen,
  columnName,
  onHideColumn,
  onCancel
}: CannotDeleteColumnModalProps) {
  
  // Handle keyboard events globally when the modal is open
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onHideColumn();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel, onHideColumn]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            Cannot Delete Column
          </DialogTitle>
          <DialogDescription className="text-left pt-2">
            The "{columnName}" column is a default column and cannot be deleted. 
            However, you can hide it if you don't need to see it in your view.
            <div className="mt-2 text-xs text-gray-500">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs border">Enter</kbd> to hide the column, or <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs border">Escape</kbd> to cancel.
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onHideColumn}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Hide Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 