import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { CustomButton } from '@/components/ui/custom-button'
import { useState } from 'react'

interface CreateListDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateList: (name: string) => void
}

export function CreateListDialog({ isOpen, onClose, onCreateList }: CreateListDialogProps) {
  const [newListName, setNewListName] = useState('')

  const handleCreateList = () => {
    if (newListName.trim()) {
      onCreateList(newListName)
      setNewListName('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-dark">
                List Name
              </label>
              <input
                id="name"
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                className="w-full p-2 border border-slate-light rounded focus:outline-none focus:ring-2 focus:ring-teal-primary"
                placeholder="Enter list name"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <CustomButton variant="outline" onClick={onClose}>
            Cancel
          </CustomButton>
          <CustomButton onClick={handleCreateList}>Create List</CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
