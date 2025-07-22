import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface Option {
  label: string
  value: string
  icon?: React.ReactNode
  badge?: string
}

interface TaskDropdownProps {
  value: string
  onSelect: (value: string) => void
  options: Option[]
  placeholder?: string
  icon?: React.ReactNode
  label?: string
  className?: string
}

export function TaskDropdown({
  value,
  onSelect,
  options,
  placeholder = 'Select...',
  icon,
  label,
  className,
}: TaskDropdownProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(option => option.value === value)

  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-24 text-sm text-muted-foreground">{label}</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('justify-between gap-2', className)}
          >
            {icon}
            {selected ? (
              <>
                <span>{selected.label}</span>
                {selected.badge && (
                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs">{selected.badge}</span>
                )}
              </>
            ) : (
              placeholder
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label?.toLowerCase() || 'options'}...`} />
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onSelect(option.value)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2"
                >
                  {option.icon}
                  <span>{option.label}</span>
                  {option.badge && (
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs ml-auto">
                      {option.badge}
                    </span>
                  )}
                  {value === option.value && <Check className="h-4 w-4 ml-auto" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
