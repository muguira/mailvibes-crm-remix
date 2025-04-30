
import { useState, useEffect } from "react";
import { ColumnType } from "@/components/list/grid-view";

export function useCellDatePicker(value: any, type: ColumnType) {
  // For date picker
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (value && type === 'date') {
      try {
        const date = new Date(value);
        return !isNaN(date.getTime()) ? date : undefined;
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  });

  // Update the date if the value prop changes
  useEffect(() => {
    if (type === 'date' && value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
        }
      } catch (e) {
        setSelectedDate(undefined);
      }
    }
  }, [value, type]);

  return { selectedDate, setSelectedDate };
}
