import * as React from 'react'
import { Check, ChevronsUpDown, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface ComboboxItem {
  value: string
  label: string
}

interface ComboboxProps {
  items: ComboboxItem[]
  value?: string
  onValueChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
  isLoading?: boolean
}

export function Combobox({
  items = [],
  value,
  onValueChange,
  onSearch,
  placeholder = 'Select an item...',
  emptyText = 'No items found.',
  className,
  isLoading = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const safeItems = React.useMemo(() => items || [], [items])
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value
      setSearchQuery(query)
      if (onSearch) {
        onSearch(query)
      }
    },
    [onSearch],
  )

  const selectedItem = React.useMemo(() => safeItems.find(item => item.value === value), [safeItems, value])

  // Focus input when popover opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // Handle escape key to close
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setSearchQuery('')
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
          onClick={e => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(!open)
          }}
        >
          <span className="truncate">{selectedItem ? selectedItem.label : placeholder}</span>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-2"
        style={{ zIndex: 'var(--task-popover-z-index, 10011)' }}
        align="start"
        side="bottom"
        sideOffset={4}
        onInteractOutside={e => {
          // Prevent closing when clicking inside the content
          const target = e.target as Element
          if (target.closest('[data-radix-popover-content]')) {
            e.preventDefault()
          }
        }}
      >
        <div className="flex items-center border-b mb-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={searchQuery}
            onChange={handleSearchChange}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={e => {
              e.stopPropagation()
              handleKeyDown(e)
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
        <div
          className="max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          onWheel={e => {
            // Allow wheel scrolling without closing the popover
            e.stopPropagation()
          }}
          onScroll={e => {
            // Allow scrolling without closing the popover
            e.stopPropagation()
          }}
        >
          {isLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <div className="text-sm text-muted-foreground mt-2">Loading...</div>
            </div>
          ) : safeItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
          ) : (
            <div className="space-y-1" role="listbox">
              {safeItems.map(item => (
                <button
                  key={item.value}
                  type="button"
                  role="option"
                  aria-selected={value === item.value}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded-sm',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                    'cursor-pointer transition-colors',
                  )}
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    const newValue = item.value === value ? '' : item.value
                    onValueChange(newValue)
                    setOpen(false)
                    setSearchQuery('')
                  }}
                  onMouseDown={e => {
                    // Prevent the popover from closing due to focus loss
                    e.preventDefault()
                  }}
                >
                  <Check className={cn('h-4 w-4 flex-shrink-0', value === item.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
