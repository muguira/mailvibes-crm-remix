import * as React from "react"
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

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
    placeholder = "Select an item...",
    emptyText = "No items found.",
    className,
    isLoading = false,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const safeItems = React.useMemo(() => items || [], [items])

    const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setSearchQuery(query)
        if (onSearch) {
            onSearch(query)
        }
    }, [onSearch])

    const selectedItem = React.useMemo(() =>
        safeItems.find((item) => item.value === value),
        [safeItems, value]
    )

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpen(!open)
                    }}
                >
                    <span className="truncate">
                        {selectedItem ? selectedItem.label : placeholder}
                    </span>
                    {isLoading ? (
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-2"
                align="start"
                side="bottom"
                sideOffset={4}
            >
                <div className="flex items-center border-b mb-2">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Input
                        placeholder={`Search ${placeholder.toLowerCase()}...`}
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                </div>
                <div className="max-h-[300px] overflow-auto">
                    {isLoading ? (
                        <div className="py-6 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            <div className="text-sm text-muted-foreground mt-2">
                                Loading...
                            </div>
                        </div>
                    ) : safeItems.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            {emptyText}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {safeItems.map((item) => (
                                <Button
                                    key={item.value}
                                    variant="ghost"
                                    className="w-full justify-start gap-2"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onValueChange(item.value === value ? "" : item.value)
                                        setOpen(false)
                                        setSearchQuery("")
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "h-4 w-4",
                                            value === item.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
} 