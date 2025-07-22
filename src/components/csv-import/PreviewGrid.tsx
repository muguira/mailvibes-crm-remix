import React from 'react'
import { ListFieldDefinition } from '@/utils/buildFieldDefinitions'
import { ParsedCsvResult } from '@/utils/parseCsv'

interface PreviewGridProps {
  parsedData: ParsedCsvResult
  listFieldDefinitions: ListFieldDefinition[]
  maxRows?: number
}

export function PreviewGrid({ parsedData, listFieldDefinitions, maxRows = 5 }: PreviewGridProps) {
  // Filter list fields that have CSV mappings
  const mappedListFields = listFieldDefinitions.filter(field => field.csvField)

  // Create rows from parsed data (limit to maxRows)
  const displayRows = parsedData.rows.slice(0, maxRows)

  // If no data, return empty state
  if (!displayRows.length || !mappedListFields.length) {
    return <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">No data to preview</div>
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {mappedListFields.map(field => (
                <th
                  key={field.fieldName}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {field.fieldName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {mappedListFields.map(field => (
                  <td key={field.fieldName} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {field.csvField && row[field.csvField] ? formatValue(row[field.csvField], field.type) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {parsedData.rows.length > maxRows && (
        <div className="px-4 py-2 bg-gray-50 text-center text-xs text-gray-500">
          Showing {maxRows} of {parsedData.rows.length} rows
        </div>
      )}
    </div>
  )
}

function formatValue(value: string, type: string): string {
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
