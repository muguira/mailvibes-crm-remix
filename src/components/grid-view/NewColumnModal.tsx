import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, X } from 'lucide-react'

interface NewColumnModalProps {
  isOpen: boolean
  initialDirection: 'left' | 'right'
  targetIdx: number
  onConfirm: (name: string, type: string, config?: any) => void
  onCancel: () => void
}

export function NewColumnModal({ isOpen, initialDirection, targetIdx, onConfirm, onCancel }: NewColumnModalProps) {
  const [columnName, setColumnName] = useState('')
  const [columnType, setColumnType] = useState('text')
  const [currencyType, setCurrencyType] = useState('USD')
  const [statusOptions, setStatusOptions] = useState<Array<{ name: string; color: string }>>([
    { name: 'Option 1', color: '#E4E5E8' },
    { name: 'Option 2', color: '#DBCDF0' },
    { name: 'Option 3', color: '#C6DEF1' },
  ])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setColumnName('')
      setColumnType('text')
      setCurrencyType('USD')
      setStatusOptions([
        { name: 'Option 1', color: '#E4E5E8' },
        { name: 'Option 2', color: '#DBCDF0' },
        { name: 'Option 3', color: '#C6DEF1' },
      ])
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (columnName.trim()) {
      let config = {}

      if (columnType === 'currency') {
        config = { currencyType }
      } else if (columnType === 'status') {
        config = {
          options: statusOptions.map(opt => opt.name),
          colors: statusOptions.reduce(
            (acc, opt) => {
              acc[opt.name] = opt.color
              return acc
            },
            {} as Record<string, string>,
          ),
        }
      }

      onConfirm(columnName.trim(), columnType, config)
      setColumnName('')
      setColumnType('text')
      setCurrencyType('USD')
      setStatusOptions([
        { name: 'Option 1', color: '#E4E5E8' },
        { name: 'Option 2', color: '#DBCDF0' },
        { name: 'Option 3', color: '#C6DEF1' },
      ])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  const addStatusOption = () => {
    const colors = ['#E4E5E8', '#DBCDF0', '#C6DEF1', '#C9E4DE', '#F4C6C6', '#FFE4B5', '#E6E6FA']
    const newColor = colors[statusOptions.length % colors.length]
    setStatusOptions([...statusOptions, { name: `Option ${statusOptions.length + 1}`, color: newColor }])
  }

  const removeStatusOption = (index: number) => {
    if (statusOptions.length > 1) {
      setStatusOptions(statusOptions.filter((_, i) => i !== index))
    }
  }

  const updateStatusOption = (index: number, field: 'name' | 'color', value: string) => {
    const updated = [...statusOptions]
    updated[index][field] = value
    setStatusOptions(updated)
  }

  const columnTypes = [
    { value: 'text', label: 'Text' },
    { value: 'date', label: 'Date' },
    { value: 'currency', label: 'Currency' },
    { value: 'status', label: 'Status' },
    { value: 'number', label: 'Number' },
  ]

  const currencyTypes = [
    { value: 'USD', label: 'USD ($)', symbol: '$' },
    { value: 'EUR', label: 'EUR (€)', symbol: '€' },
    { value: 'GBP', label: 'GBP (£)', symbol: '£' },
    { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
    { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
    { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
    { value: 'MXN', label: 'MXN ($)', symbol: '$' },
    { value: 'CHF', label: 'CHF (CHF)', symbol: 'CHF' },
    { value: 'CNY', label: 'CNY (¥)', symbol: '¥' },
    { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Insert column {initialDirection}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="columnName">Column name</Label>
            <Input
              id="columnName"
              autoFocus
              placeholder="Enter column name"
              value={columnName}
              onChange={e => setColumnName(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="columnType">Column type</Label>
            <Select value={columnType} onValueChange={setColumnType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select column type" />
              </SelectTrigger>
              <SelectContent>
                {columnTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {columnType === 'currency' && (
            <div className="space-y-2">
              <Label htmlFor="currencyType">Currency type</Label>
              <Select value={currencyType} onValueChange={setCurrencyType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyTypes.map(currency => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {columnType === 'status' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Status options</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStatusOption}
                  className="flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add option
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {statusOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Option name"
                      value={option.name}
                      onChange={e => updateStatusOption(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={option.color}
                        onChange={e => updateStatusOption(index, 'color', e.target.value)}
                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                      />
                      {statusOptions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStatusOption(index)}
                          className="p-1 h-8 w-8"
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!columnName.trim()}>
              Add Column
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
