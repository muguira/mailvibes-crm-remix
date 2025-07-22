import { useState, useEffect } from 'react'
import { ColumnType } from '@/components/list/grid-view'
import { parseISO } from 'date-fns'

export function useCellDatePicker(value: any, type: ColumnType) {
  // For date picker - ensure we parse the date properly
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => {
    if (value && type === 'date') {
      try {
        const date = parseISO(value)
        return !isNaN(date.getTime()) ? date : undefined
      } catch (e) {
        return undefined
      }
    }
    return undefined
  })

  // Update the selected date when the value prop changes
  useEffect(() => {
    if (type === 'date' && value) {
      try {
        const date = parseISO(value)
        if (!isNaN(date.getTime())) {
          setSelectedDate(date)
        }
      } catch (e) {
        setSelectedDate(undefined)
      }
    } else if (!value) {
      setSelectedDate(undefined)
    }
  }, [value, type])

  return { selectedDate, setSelectedDate }
}
