import { formatValue } from '@/helpers/csv'
import { ListFieldDefinition } from '@/utils/buildFieldDefinitions'
import { ParsedCsvResult } from '@/utils/parseCsv'

/**
 * Props for the PreviewGrid component
 */
interface PreviewGridProps {
  /** Parsed CSV data containing headers and rows */
  parsedData: ParsedCsvResult
  /** List field definitions with CSV mappings */
  listFieldDefinitions: ListFieldDefinition[]
  /** Maximum number of rows to display in preview */
  maxRows?: number
}

/**
 * A table component that previews how list data will appear after CSV import.
 *
 * This component renders a table showing the mapped list fields as columns
 * and a limited number of data rows from the CSV. It helps users understand
 * how their field mappings will translate to the final list structure.
 *
 * Features:
 * - Table format with proper headers and data cells
 * - Configurable row limit for preview
 * - Type-aware value formatting (numbers, dates, etc.)
 * - Empty state handling
 * - Row count indicator for large datasets
 * - Responsive table with overflow handling
 * - Proper data type formatting
 *
 * @example
 * ```tsx
 * <PreviewGrid
 *   parsedData={csvData}
 *   listFieldDefinitions={mappedFields}
 *   maxRows={3}
 * />
 * ```
 */
export function PreviewGrid({ parsedData, listFieldDefinitions, maxRows = 5 }: PreviewGridProps) {
  /** List fields that have been mapped to CSV columns */
  const mappedListFields = listFieldDefinitions.filter(field => field.csvField)

  /** Limited set of rows for preview display */
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
