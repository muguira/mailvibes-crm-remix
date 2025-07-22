import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ListFieldDefinition } from '@/utils/buildFieldDefinitions'
import { AccountFieldMapping, mapColumnsToAccount } from '@/utils/mapColumnsToAccount'
import { FieldMapping, mapColumnsToContact } from '@/utils/mapColumnsToContact'
import { ParsedCsvResult } from '@/utils/parseCsv'
import { Building2, Pencil, User } from 'lucide-react'
import { PreviewGrid } from './PreviewGrid'

/**
 * Props for the ReviewCompleteStep component
 */
interface ReviewCompleteStepProps {
  /** Parsed CSV data containing headers and rows */
  parsedData: ParsedCsvResult
  /** Contact field mappings from step 2 */
  contactFieldMappings: FieldMapping[]
  /** Account field mappings from step 3 */
  accountFieldMappings: AccountFieldMapping[]
  /** List field definitions from step 4 */
  listFieldDefinitions: ListFieldDefinition[]
  /** Type of relationships (contacts or accounts) */
  relationType: 'contacts' | 'accounts'
  /** Callback fired when user wants to edit a previous step */
  onEditStep: (step: number) => void
}

/**
 * Final review step component in the CSV import wizard.
 *
 * This component provides a comprehensive overview of all the mappings and
 * configurations made in previous steps before executing the import. Users
 * can review their choices and make last-minute edits if needed.
 *
 * Features:
 * - Summary of contact property mappings with preview data
 * - Summary of account property mappings with preview data
 * - Preview grid of list fields with actual CSV data
 * - Edit buttons for each step to allow corrections
 * - Visual cards with icons for contact and account data
 * - Live preview using first row of CSV data
 * - Organized layout with clear sections
 *
 * @example
 * ```tsx
 * <ReviewCompleteStep
 *   parsedData={csvData}
 *   contactFieldMappings={contactMappings}
 *   accountFieldMappings={accountMappings}
 *   listFieldDefinitions={listFields}
 *   relationType="accounts"
 *   onEditStep={(step) => setCurrentStep(step)}
 * />
 * ```
 */
export function ReviewCompleteStep({
  parsedData,
  contactFieldMappings,
  accountFieldMappings,
  listFieldDefinitions,
  onEditStep,
}: ReviewCompleteStepProps) {
  /** First row of CSV data used for preview examples */
  const firstRow = parsedData.rows[0] || {}
  /** Second row of CSV data (not currently used but available for future enhancements) */
  const secondRow = parsedData.rows[1] || {}
  /** Preview contact object created from first row and current mappings */
  const contactExample = mapColumnsToContact(firstRow, contactFieldMappings)
  /** Preview account object created from first row and current mappings */
  const accountExample = mapColumnsToAccount(firstRow, accountFieldMappings)

  /** List fields that have been mapped to CSV columns for grid preview */
  const mappedListFields = listFieldDefinitions.filter(field => field.csvField)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Review and Complete Your Import</h2>
        <p className="text-gray-600 text-sm">
          Here is a preview of the data you will be importing into RelateIQ. If you need to make any corrections, click
          the pencil to edit the information.
        </p>
        <p className="text-gray-600 text-sm mt-2">
          Click Save to see the complete your import and create your new List: test.
        </p>
        <p className="text-gray-600 text-sm">
          Accounts or Contacts you did not add to test are stored in your Account and Contact Galleries.
        </p>
      </div>

      {/* Review Your Import - Example Values */}
      <div className="bg-[#62BFAA] text-white rounded-t-lg px-4 py-3">
        <h3 className="font-medium">Review Your Import - Example Values</h3>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Contact Properties Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              Contact Properties
              <Button variant="ghost" size="sm" onClick={() => onEditStep(1)} className="ml-2">
                <Pencil className="w-4 h-4" />
              </Button>
            </h3>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-gray-400" />
            </div>

            <div className="flex-1 space-y-3 text-sm">
              {contactFieldMappings.map(mapping => {
                const value = firstRow[mapping.csvField] || '-'
                let label = mapping.contactProperty

                // Format label properly
                if (mapping.contactProperty === 'name') {
                  if (mapping.nameType === 'first') {
                    label = 'firstName'
                  } else if (mapping.nameType === 'last') {
                    label = 'lastName'
                  }
                }

                return (
                  <div key={`${mapping.contactProperty}-${mapping.nameType || ''}`}>
                    <span className="text-gray-500 italic">{label}: </span>
                    <span className="text-gray-900">{value}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Account Properties Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              Account Properties
              <Button variant="ghost" size="sm" onClick={() => onEditStep(2)} className="ml-2">
                <Pencil className="w-4 h-4" />
              </Button>
            </h3>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>

            <div className="flex-1 space-y-3 text-sm">
              {accountFieldMappings.map(mapping => {
                const value = firstRow[mapping.csvField] || '-'

                return (
                  <div key={mapping.accountProperty}>
                    <span className="text-gray-500 italic">{mapping.accountProperty}: </span>
                    <span className="text-gray-900">{value}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* List Fields Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            List Fields
            <Button variant="ghost" size="sm" onClick={() => onEditStep(3)} className="ml-2">
              <Pencil className="w-4 h-4" />
            </Button>
          </h3>
        </div>

        {/* List Fields Grid Preview */}
        <PreviewGrid parsedData={parsedData} listFieldDefinitions={listFieldDefinitions} maxRows={2} />
      </div>
    </div>
  )
}
