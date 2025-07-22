/**
 * Formats a value based on its field type for display in the preview grid
 * @param value - The raw value from CSV
 * @param type - The field type (number, date, list, text)
 * @returns Formatted string for display
 */
export function formatValue(value: string, type: string): string {
  if (!value) return '-'

  switch (type) {
    case 'number':
      const num = parseFloat(value)
      return isNaN(num) ? value : num.toLocaleString()
    case 'date':
      const date = new Date(value)
      return isNaN(date.getTime()) ? value : date.toLocaleDateString()
    case 'list':
      return value // Already a string, just display it
    default:
      return value
  }
}
