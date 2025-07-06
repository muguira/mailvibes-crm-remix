import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteContactsDialogProps {
  isLoading?: boolean;
  isOpen: boolean;
  contactCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteContactsDialog({
  isOpen,
  contactCount,
  onClose,
  onConfirm,
  isLoading = false
}: DeleteContactsDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  
  const handleConfirm = () => {
    if (confirmText.toUpperCase() === 'DELETE') {
      onConfirm();
      setConfirmText('');
    }
  };
  
  const handleClose = () => {
    if (!isLoading) {
      setConfirmText('');
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete {contactCount} contact{contactCount !== 1 ? 's' : ''}?
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <span className="block">
              You're about to delete {contactCount} contact{contactCount !== 1 ? 's' : ''}. 
              Deleted contacts can't be restored after 90 days.
            </span>
            <span className="block">
              Records created after this submission will not be deleted.
            </span>
            <span className="block font-medium">Type <span className="text-red-600 font-mono">DELETE</span> to confirm:</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type 'DELETE' to confirm"
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && confirmText.toUpperCase() === 'DELETE' && !isLoading) {
                handleConfirm();
              }
            }}
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={confirmText.toUpperCase() !== 'DELETE' || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>Delete Contact{contactCount !== 1 ? 's' : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
