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
                            backgroundColor: "rgb(var(--primary))",
                            color: "rgb(var(--primary-foreground))"
                        }
                    }}
                    classNames={{
                        day_today: "bg-primary/ text-primary font-semibold",
                        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                    }}
                />
                {date && (
                    <div className="p-2 border-t border-border">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-destructive hover:text-destructive"
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