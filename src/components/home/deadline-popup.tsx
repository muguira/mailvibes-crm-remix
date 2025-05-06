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
    return (
        <Popover>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onSelect}
                    initialFocus
                    locale={es}
                />
                {date && (
                    <div className="p-2 border-t border-border">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-destructive hover:text-destructive"
                            onClick={() => onSelect(undefined)}
                        >
                            Remove deadline
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
} 