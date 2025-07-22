import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '@/stores'

interface DeleteColumnDialogProps {
  // isOpen, columnName, onClose - now obtained from Zustand slice internally
  onConfirm: () => void
}

export function DeleteColumnDialog({ onConfirm }: DeleteColumnDialogProps) {
  // Get dialog state from Zustand slice
  const { deleteColumnDialog, editableLeadsGridCloseDeleteColumnDialog } = useStore()

  const { isOpen, columnName } = deleteColumnDialog

  const [confirmText, setConfirmText] = useState('')
  const isConfirmValid = confirmText === 'DELETE'

  const handleClose = () => {
    setConfirmText('')
    editableLeadsGridCloseDeleteColumnDialog()
  }

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm()
      setConfirmText('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isConfirmValid) {
      e.preventDefault()
      handleConfirm()
    }
  }

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
          <AlertDialogDescription className="mt-4">
            Are you sure you want to delete the column <strong>"{columnName}"</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 pb-4">
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            <div className="font-semibold mb-1">⚠️ This action is permanent and cannot be undone.</div>
            <div>All data in this column will be permanently deleted.</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">
              To confirm, type <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">DELETE</span> below:
            </div>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type DELETE to confirm"
              className="font-mono"
              autoFocus
            />
          </div>
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!isConfirmValid}>
            Delete Column
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
