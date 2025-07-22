import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'

/**
 * Props for the NewPropertyModal component
 */
interface NewPropertyModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback fired when the modal should close */
  onClose: () => void
  /** Callback fired when the user confirms property creation */
  onConfirm: (propertyName: string) => void
  /** Custom title for the modal */
  title?: string
}

/**
 * Modal dialog for creating new custom properties during CSV import.
 *
 * This simple modal allows users to create new account or contact properties
 * by providing a name. It's typically used when users want to map CSV fields
 * to properties that don't exist in the predefined set.
 *
 * Features:
 * - Simple text input for property name
 * - Input validation (requires non-empty name)
 * - Enter key support for quick submission
 * - Automatic input clearing on close
 * - Customizable modal title
 *
 * @example
 * ```tsx
 * <NewPropertyModal
 *   isOpen={modalOpen}
 *   title="Create New Account Property"
 *   onClose={() => setModalOpen(false)}
 *   onConfirm={(name) => createCustomProperty(name)}
 * />
 * ```
 */
export function NewPropertyModal({ isOpen, onClose, onConfirm, title = 'Create New Property' }: NewPropertyModalProps) {
  /** Current property name input value */
  const [propertyName, setPropertyName] = useState('')

  /**
   * Handles form submission and property creation
   * Validates input and calls onConfirm callback
   */
  const handleConfirm = () => {
    if (propertyName.trim()) {
      onConfirm(propertyName.trim())
      setPropertyName('')
      onClose()
    }
  }

  /**
   * Handles modal close with input cleanup
   */
  const handleClose = () => {
    setPropertyName('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="property-name">Property Name</Label>
            <Input
              id="property-name"
              value={propertyName}
              onChange={e => setPropertyName(e.target.value)}
              placeholder="Enter property name"
              className="w-full"
              onKeyPress={e => {
                if (e.key === 'Enter' && propertyName.trim()) {
                  handleConfirm()
                }
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!propertyName.trim()}
            className="bg-[#62BFAA] hover:bg-[#52AF9A] text-white"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
