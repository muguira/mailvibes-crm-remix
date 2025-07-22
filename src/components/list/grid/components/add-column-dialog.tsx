import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CustomButton } from '@/components/ui/custom-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { ColumnType } from '../types'

interface AddColumnDialogProps {
  isAddingColumn: boolean
  setIsAddingColumn: (isAdding: boolean) => void
  newColumn: {
    header: string
    type: ColumnType
    options?: string[]
    colors?: Record<string, string>
  }
  setNewColumn: (newCol: {
    header: string
    type: ColumnType
    options?: string[]
    colors?: Record<string, string>
  }) => void
  addColumn: () => void
}

export function AddColumnDialog({
  isAddingColumn,
  setIsAddingColumn,
  newColumn,
  setNewColumn,
  addColumn,
}: AddColumnDialogProps) {
  const [colorPickerOption, setColorPickerOption] = useState<string | null>(null)

  const defaultColors = {
    'Deal Won': '#22c55e', // green
    Qualified: '#3b82f6', // blue
    'Contract Sent': '#eab308', // yellow
    'In Procurement': '#d97706', // amber
    Discovered: '#f97316', // orange
    'Not Now': '#ef4444', // red
    New: '#a855f7', // purple
  }

  return (
    <Dialog open={isAddingColumn} onOpenChange={setIsAddingColumn}>
      <DialogTrigger asChild>
        <button className="w-6 h-6 flex items-center justify-center rounded-full bg-teal-primary/10 hover:bg-teal-primary/20 text-teal-primary">
          <Plus size={14} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="column-name" className="text-sm font-medium">
              Column Name
            </label>
            <input
              id="column-name"
              value={newColumn?.header || ''}
              onChange={e => {
                setNewColumn({
                  ...newColumn,
                  header: e.target.value,
                })
              }}
              className="w-full p-2 border border-slate-light/50 rounded"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="column-type" className="text-sm font-medium">
              Column Type
            </label>
            <Select
              value={newColumn?.type || 'text'}
              onValueChange={(value: ColumnType) => {
                setNewColumn({
                  ...newColumn,
                  type: value,
                  options: value === 'status' || value === 'select' ? ['New'] : undefined,
                  colors: value === 'status' ? { New: '#a855f7' } : undefined,
                })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
                <SelectItem value="url">URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(newColumn?.type === 'select' || newColumn?.type === 'status') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-light/50 rounded p-2">
                {(newColumn.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={option}
                      onChange={e => {
                        const newOptions = [...(newColumn.options || [])]
                        newOptions[index] = e.target.value
                        setNewColumn({
                          ...newColumn,
                          options: newOptions,
                        })
                      }}
                      className="flex-1 p-2 border border-slate-light/50 rounded text-sm"
                    />

                    {newColumn.type === 'status' && (
                      <div
                        className="w-6 h-6 rounded cursor-pointer"
                        style={{ backgroundColor: newColumn.colors?.[option] || '#888888' }}
                        onClick={() => setColorPickerOption(option)}
                      />
                    )}

                    <button
                      onClick={() => {
                        const newOptions = [...(newColumn.options || [])]
                        newOptions.splice(index, 1)

                        // Also remove color if it's a status field
                        let newColors = { ...(newColumn.colors || {}) }
                        if (newColumn.type === 'status' && option in newColors) {
                          delete newColors[option]
                        }

                        setNewColumn({
                          ...newColumn,
                          options: newOptions,
                          colors: newColumn.type === 'status' ? newColors : undefined,
                        })
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {colorPickerOption && newColumn.type === 'status' && (
                  <div className="mt-2 p-2 border border-slate-200 rounded">
                    <div className="text-sm font-medium mb-2">Select color for "{colorPickerOption}"</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(defaultColors).map(([_, color]) => (
                        <div
                          key={color}
                          className="w-6 h-6 rounded cursor-pointer border border-slate-300"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setNewColumn({
                              ...newColumn,
                              colors: {
                                ...(newColumn.colors || {}),
                                [colorPickerOption]: color,
                              },
                            })
                            setColorPickerOption(null)
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="text-xs">Custom color (hex)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="#RRGGBB"
                          className="flex-1 p-1 text-sm border border-slate-300 rounded"
                          onBlur={e => {
                            const colorValue = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
                            setNewColumn({
                              ...newColumn,
                              colors: {
                                ...(newColumn.colors || {}),
                                [colorPickerOption]: colorValue,
                              },
                            })
                            setColorPickerOption(null)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement
                              const colorValue = input.value.startsWith('#') ? input.value : `#${input.value}`
                              setNewColumn({
                                ...newColumn,
                                colors: {
                                  ...(newColumn.colors || {}),
                                  [colorPickerOption]: colorValue,
                                },
                              })
                              setColorPickerOption(null)
                            }
                          }}
                        />
                        <button
                          onClick={() => setColorPickerOption(null)}
                          className="px-2 bg-slate-100 rounded hover:bg-slate-200"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (newColumn.type === 'status') {
                      setNewColumn({
                        ...newColumn,
                        options: [...(newColumn.options || []), 'New Option'],
                        colors: {
                          ...(newColumn.colors || {}),
                          'New Option': '#888888',
                        },
                      })
                    } else {
                      setNewColumn({
                        ...newColumn,
                        options: [...(newColumn.options || []), 'New Option'],
                      })
                    }
                  }}
                  className="w-full p-2 mt-2 bg-slate-100 hover:bg-slate-200 rounded text-sm"
                >
                  + Add Option
                </button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <CustomButton variant="outline" size="sm" onClick={() => setIsAddingColumn(false)}>
            Cancel
          </CustomButton>
          <CustomButton variant="default" size="sm" onClick={addColumn} disabled={!newColumn?.header}>
            Add Column
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
