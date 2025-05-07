import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { es } from 'date-fns/locale';
import { X } from "lucide-react";

interface DeadlinePopupProps {
    date?: Date;
    onSelect: (date: Date | undefined) => void;
    children: React.ReactNode;
}

export function DeadlinePopup({
    date,
    onSelect,
    children
}: DeadlinePopupProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSelect = (newDate: Date | undefined) => {
        onSelect(newDate);
        if (newDate) {
            setIsOpen(false);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <div className="flex items-center justify-between p-2 border-b border-border">
                    <span className="text-sm font-medium">Select date</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-accent"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    initialFocus
                    locale={es}
                    defaultMonth={date}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    modifiersStyles={{
                        today: {
                            backgroundColor: "rgb(var(--teal) / 0.15)",
                            color: "rgb(var(--teal))"
                        },
                        selected: {
                            backgroundColor: "#62BFAA",
                            color: "white",
                            borderRadius: "5px"
                        }
                    }}
                    classNames={{
                        day_today: "text-[#62BFAA] font-semibold",
                        day_selected: "!bg-[#62BFAA] text-white hover:!bg-[#62BFAA] hover:text-white focus:!bg-[#62BFAA] focus:text-white",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#62BFAA]/70 hover:text-white focus-visible:bg-[#62BFAA] focus-visible:text-white rounded-[5px]",
                        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-transparent"
                    }}
                />
                {date && (
                    <div className="p-2 border-t border-border">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-destructive hover:text-destructive hover:bg-red-100"
                            onClick={() => handleSelect(undefined)}
                        >
                            Remove deadline
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
} 