import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

interface DeleteColumnDialogProps {
  isOpen: boolean;
  columnName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteColumnDialog({
  isOpen,
  columnName,
  onClose,
  onConfirm,
}: DeleteColumnDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmValid = confirmText === 'DELETE';

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm();
      setConfirmText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isConfirmValid) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">Delete Column</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-4 space-y-3">
            <p>
              Are you sure you want to delete the column <strong>"{columnName}"</strong>?
            </p>
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold mb-1">⚠️ This action is permanent and cannot be undone.</p>
              <p>All data in this column will be permanently deleted.</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                To confirm, type <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">DELETE</span> below:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type DELETE to confirm"
                className="font-mono"
                autoFocus
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid}
          >
            Delete Column
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 