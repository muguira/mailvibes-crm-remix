import React, { useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Filter, X, ChevronLeft } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FilterValueSelector } from '@/components/grid-view/FilterValueSelectors'
import { cn } from '@/lib/utils'

export interface FilterColumn {
  id: string
  title: string
  type?: string
  options?: string[]
  colors?: Record<string, string>
}

export interface FilterPopupBaseProps {
  columns: FilterColumn[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedColumns: string[]
  onSelectedColumnsChange: (columns: string[]) => void
  filterValues: Record<string, any>
  onFilterValuesChange: (values: Record<string, any>) => void
  onApplyFilters: () => void
  onClearFilters: () => void
  triggerClassName?: string
  align?: 'start' | 'center' | 'end'
  renderFilterValueSelector?: (column: FilterColumn) => React.ReactNode
  iconOnly?: boolean
  data?: any[] // Optional data for extracting unique values
}

export function FilterPopupBase({
  columns,
  isOpen,
  onOpenChange,
  selectedColumns,
  onSelectedColumnsChange,
  filterValues,
  onFilterValuesChange,
  onApplyFilters,
  onClearFilters,
  triggerClassName = '',
  align = 'end',
  renderFilterValueSelector,
  iconOnly = false,
  data = [],
}: FilterPopupBaseProps) {
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Reset selected field when popup closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedField(null)
    }
  }, [isOpen])

  // Force re-evaluation when filter values change
  useEffect(() => {
    setForceUpdate(prev => prev + 1)
  }, [filterValues])

  // Handle checkbox change for column selection
  const handleColumnSelect = (columnId: string, checked: boolean) => {
    let newSelectedColumns: string[]
    let newFilterValues = { ...filterValues }

    if (checked) {
      newSelectedColumns = [...selectedColumns, columnId]
      // If we're selecting a column, automatically show its detail panel
      setSelectedField(columnId)
    } else {
      newSelectedColumns = selectedColumns.filter(id => id !== columnId)

      // If we're deselecting the currently selected field, choose another one or null
      if (columnId === selectedField) {
        setSelectedField(newSelectedColumns.length > 0 ? newSelectedColumns[0] : null)
      }

      // Remove the filter value for this column
      delete newFilterValues[columnId]
      onFilterValuesChange(newFilterValues)

      // Immediately apply the updated filters to clear the deselected filter
      onApplyFilters()
    }

    onSelectedColumnsChange(newSelectedColumns)
  }

  // Handle filter value change for a specific column
  const handleFilterValueChange = (columnId: string, value: any) => {
    const newFilterValues = {
      ...filterValues,
      [columnId]: value,
    }
    onFilterValuesChange(newFilterValues)
  }

  // Get active filter badges with more descriptive text
  const getActiveFilterBadges = () => {
    return selectedColumns.map(columnId => {
      const column = columns.find(col => col.id === columnId)
      if (!column) return null

      const filterValue = filterValues[columnId]
      let badgeText = column.title

      // Add descriptive text based on filter value
      if (filterValue) {
        if (filterValue.type === 'text' && filterValue.text) {
          badgeText += `: ${filterValue.operator} "${filterValue.text}"`
        } else if (filterValue.type === 'dropdown') {
          if (Array.isArray(filterValue.values) && filterValue.values.length > 0) {
            // Multi-select dropdown
            badgeText += `: ${filterValue.values.length} selected`
          } else if (filterValue.value && filterValue.value !== '' && filterValue.value !== '__all__') {
            // Single-select dropdown
            badgeText += `: ${filterValue.value}`
          }
        } else if (filterValue.type === 'status' && filterValue.statuses?.length > 0) {
          badgeText += `: ${filterValue.statuses.length} selected`
        } else if (filterValue.type === 'date') {
          if (filterValue.operator === 'between' && filterValue.startDate && filterValue.endDate) {
            badgeText += `: ${filterValue.operator}`
          } else if (filterValue.startDate || filterValue.endDate) {
            badgeText += `: ${filterValue.operator}`
          }
        } else if (filterValue.type === 'number') {
          if (filterValue.operator === 'between' && filterValue.number1 && filterValue.number2) {
            badgeText += `: ${filterValue.number1} - ${filterValue.number2}`
          } else if (filterValue.number1) {
            badgeText += `: ${filterValue.operator} ${filterValue.number1}`
          }
        }
      }

      return (
        <Badge key={columnId} variant="outline" className="gap-1 max-w-[200px]">
          <span className="truncate">{badgeText}</span>
          <X
            size={14}
            className="cursor-pointer flex-shrink-0"
            onClick={() => {
              // Remove this column from selection and immediately apply filters
              const newSelectedColumns = selectedColumns.filter(id => id !== columnId)
              const newFilterValues = { ...filterValues }
              delete newFilterValues[columnId]

              onSelectedColumnsChange(newSelectedColumns)
              onFilterValuesChange(newFilterValues)

              // Immediately apply the updated filters
              onApplyFilters()
            }}
          />
        </Badge>
      )
    })
  }

  // Check if current filter has valid values - improved version
  const hasValidFilter = () => {
    if (!selectedField) return false

    const filterValue = filterValues[selectedField]
    if (!filterValue) return false

    // Status filters
    if (filterValue.type === 'status') {
      return Array.isArray(filterValue.statuses) && filterValue.statuses.length > 0
    }

    // Dropdown filters (both single and multi-select)
    if (filterValue.type === 'dropdown') {
      // Multi-select dropdown (has values array)
      if (filterValue.values && Array.isArray(filterValue.values)) {
        return filterValue.values.length > 0
      }
      // Single-select dropdown (has value string)
      if (filterValue.value) {
        return filterValue.value !== '' && filterValue.value !== '__all__'
      }
      return false
    }

    // Date filters
    if (filterValue.type === 'date') {
      if (!filterValue.operator) return false
      if (filterValue.operator === 'is_empty' || filterValue.operator === 'is_not_empty') {
        return true
      }
      return !!(filterValue.startDate || filterValue.endDate || filterValue.value)
    }

    // Text filters
    if (filterValue.type === 'text') {
      if (!filterValue.operator) return false
      if (filterValue.operator === 'is_empty' || filterValue.operator === 'is_not_empty') {
        return true
      }
      return !!(filterValue.value || filterValue.text)
    }

    // Number filters
    if (filterValue.type === 'number') {
      if (!filterValue.operator) return false
      if (filterValue.operator === 'is_empty' || filterValue.operator === 'is_not_empty') {
        return true
      }
      return filterValue.number1 !== undefined || filterValue.value !== undefined
    }

    // Hidden columns filter
    if (filterValue.type === 'hidden_columns') {
      return filterValue.showHidden === true
    }

    return false
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`${triggerClassName} ${selectedColumns.length > 0 ? 'bg-primary/10 border-primary/30' : ''}`}
          onClick={() => onOpenChange(!isOpen)}
        >
          <Filter size={16} className={iconOnly ? '' : 'mr-1'} />
          {!iconOnly && 'Filter'}
          {selectedColumns.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 bg-gray-100 text-gray-700 h-5 min-w-5 flex items-center justify-center badge"
            >
              {selectedColumns.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 shadow-lg rounded-lg z-[10004]" align={align}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-medium text-sm">Filter Data</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearFilters}
            className="text-xs h-7 px-2"
            disabled={selectedColumns.length === 0}
          >
            Clear All
          </Button>
        </div>

        {selectedField ? (
          // Detail view for selected column
          <div className="border-b border-gray-100">
            <div className="p-3">
              <div className="flex items-center mb-3">
                <button
                  onClick={() => setSelectedField(null)}
                  className="text-xs flex items-center text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  Back
                </button>
                <p className="text-xs font-medium ml-2">{columns.find(col => col.id === selectedField)?.title}</p>
              </div>

              <div className="space-y-3">
                {renderFilterValueSelector ? (
                  renderFilterValueSelector(columns.find(col => col.id === selectedField)!)
                ) : (
                  <FilterValueSelector
                    column={columns.find(col => col.id === selectedField)!}
                    value={filterValues[selectedField]}
                    onChange={value => handleFilterValueChange(selectedField, value)}
                    data={data}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          // Column selection view
          <>
            <div className="border-b border-gray-100 p-3 overflow-y-auto max-h-[300px]">
              <p className="text-xs font-medium mb-2 text-gray-500">Select Columns to Filter</p>
              {columns.map(column => (
                <div
                  key={column.id}
                  className={cn(
                    'flex items-center justify-between py-3 px-3 rounded-md cursor-pointer hover:bg-gray-50 transition-colors border border-transparent',
                    selectedColumns.includes(column.id) ? 'bg-blue-50 border-blue-200' : 'hover:border-gray-200',
                  )}
                  onClick={() => {
                    // Always navigate to filter details when clicking a column
                    if (!selectedColumns.includes(column.id)) {
                      // If not selected, add it to selected columns
                      onSelectedColumnsChange([...selectedColumns, column.id])
                    }
                    // Always open the filter details
                    setSelectedField(column.id)
                  }}
                >
                  <span
                    className={cn(
                      'text-sm font-medium',
                      selectedColumns.includes(column.id) ? 'text-primary' : 'text-gray-900',
                    )}
                  >
                    {column.title}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{column.type || 'text'}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="p-3 border-t border-gray-100">
          <Button className="w-full" size="sm" disabled={!selectedField} onClick={onApplyFilters}>
            Apply Filters {selectedColumns.length > 0 && `(${selectedColumns.length})`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
