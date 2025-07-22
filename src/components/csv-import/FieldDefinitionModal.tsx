import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldType } from '@/utils/buildFieldDefinitions'
import { useState } from 'react'

/**
 * Props for the FieldDefinitionModal component
 */
interface FieldDefinitionModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback fired when the modal should close */
  onClose: () => void
  /** Callback fired when the user confirms field creation */
  onConfirm: (fieldName: string, type: FieldType) => void
  /** Default value for the field name input */
  defaultFieldName?: string
  /** The CSV field name being mapped */
  csvField: string
}

/**
 * Modal dialog for defining custom list fields during CSV import.
 *
 * This modal allows users to create new list fields by specifying a field name
 * and selecting an appropriate data type. It's typically triggered when a user
 * drags a CSV field to the "Add a Field" placeholder in the list fields step.
 *
 * Features:
 * - Field name input with validation
 * - Data type selection (text, number, date, list)
 * - Auto-populated field name based on CSV field
 * - Form validation and submit handling
 * - Responsive dialog interface
 *
 * @example
 * ```tsx
 * <FieldDefinitionModal
 *   isOpen={modalOpen}
 *   csvField="budget_amount"
 *   onClose={() => setModalOpen(false)}
 *   onConfirm={(name, type) => createListField(name, type)}
 * />
 * ```
 */
export function FieldDefinitionModal({
  isOpen,
  onClose,
  onConfirm,
  defaultFieldName = '',
  csvField,
}: FieldDefinitionModalProps) {
  /** Current field name input value */
  const [fieldName, setFieldName] = useState(defaultFieldName || csvField)
  /** Selected field type */
  const [fieldType, setFieldType] = useState<FieldType>('text')

  /**
   * Handles form submission and field creation
   * Validates input and calls onConfirm callback
   */
  const handleConfirm = () => {
    if (fieldName.trim()) {
      onConfirm(fieldName.trim(), fieldType)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Define List Field</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="field-name">Field Name</Label>
            <Input
              id="field-name"
              value={fieldName}
              onChange={e => setFieldName(e.target.value)}
              placeholder="Enter field name"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-type">Type</Label>
            <Select value={fieldType} onValueChange={value => setFieldType(value as FieldType)}>
              <SelectTrigger id="field-type" className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="list">List</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!fieldName.trim()}
            className="bg-[#62BFAA] hover:bg-[#52AF9A] text-white"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
