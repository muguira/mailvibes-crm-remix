import React from 'react'
import { format } from 'date-fns'
import { Column, GridRow } from './types'

export function isColorLight(color: string): boolean {
  const hex = color.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128
}

export function renderStatusPill(value: string, colors: Record<string, string>) {
  if (!value) return null
  const backgroundColor = colors[value] || '#f3f4f6'
  const isLight = isColorLight(backgroundColor)
  const textColor = isLight ? '#000000' : '#ffffff'
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor, color: textColor }}>
      {value}
    </span>
  )
}

export function formatCellValue(value: any, column: Column, row?: GridRow) {
  if (!row) return ''
  if (value === undefined || value === null) return ''

  if (column.renderCell && row) {
    return column.renderCell(value, row)
  }
  switch (column.type) {
    case 'currency':
      const currencyCode = column.currencyType || 'USD'
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(value))
    case 'status':
      return renderStatusPill(value, column.colors || {})
    case 'date':
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return format(date, 'MMM d, yyyy')
        }
      } catch (e) {}
      return value
    default:
      return String(value)
  }
}
