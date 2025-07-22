import React, { useEffect, useRef } from 'react'
import { ColumnType } from '../grid/types'

interface EditCellProps {
  value: any
  type: ColumnType
  onBlur: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function EditCell({ value, type, onBlur, onKeyDown }: EditCellProps) {
  const inputValue = type === 'currency' ? value?.replace(/[^0-9.-]+/g, '') : value
  const inputRef = useRef<HTMLInputElement>(null)

  // This effect runs once when the component mounts
  useEffect(() => {
    // Use setTimeout to ensure this runs after browser's default focus behavior
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()

        // Move cursor to the end of the text
        const length = inputRef.current.value.length || 0
        inputRef.current.setSelectionRange(length, length)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  // Handle focus event to ensure cursor is always at the end
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const length = e.target.value.length || 0
    // Use another setTimeout to ensure this happens after the browser's selection
    setTimeout(() => {
      e.target.setSelectionRange(length, length)
    }, 0)
  }

  return (
    <input
      ref={inputRef}
      type={type === 'number' || type === 'currency' ? 'number' : 'text'}
      className="w-full h-full bg-transparent outline-none"
      defaultValue={inputValue}
      onFocus={handleFocus}
      onBlur={e => onBlur(e.target.value)}
      onKeyDown={onKeyDown}
    />
  )
}
