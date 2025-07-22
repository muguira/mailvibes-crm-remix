import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FieldType } from '@/utils/buildFieldDefinitions'

interface FieldDefinitionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (fieldName: string, type: FieldType) => void
  defaultFieldName?: string
  csvField: string
}

export function FieldDefinitionModal({
  isOpen,
  onClose,
  onConfirm,
  defaultFieldName = '',
  csvField,
}: FieldDefinitionModalProps) {
  const [fieldName, setFieldName] = useState(defaultFieldName || csvField)
  const [fieldType, setFieldType] = useState<FieldType>('text')

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
