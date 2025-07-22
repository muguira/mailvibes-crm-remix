import React from 'react'
import { User, Building2, Pencil } from 'lucide-react'
import { ParsedCsvResult } from '@/utils/parseCsv'
import { FieldMapping, mapColumnsToContact } from '@/utils/mapColumnsToContact'
import { AccountFieldMapping, mapColumnsToAccount } from '@/utils/mapColumnsToAccount'
import { ListFieldDefinition } from '@/utils/buildFieldDefinitions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PreviewGrid } from './PreviewGrid'

interface ReviewCompleteStepProps {
  parsedData: ParsedCsvResult
  contactFieldMappings: FieldMapping[]
  accountFieldMappings: AccountFieldMapping[]
  listFieldDefinitions: ListFieldDefinition[]
  relationType: 'contacts' | 'accounts'
  onEditStep: (step: number) => void
}

export function ReviewCompleteStep({
  parsedData,
  contactFieldMappings,
  accountFieldMappings,
  listFieldDefinitions,
  relationType,
  onEditStep,
}: ReviewCompleteStepProps) {
  // Get first row for preview
  const firstRow = parsedData.rows[0] || {}
  const secondRow = parsedData.rows[1] || {}
  const contactExample = mapColumnsToContact(firstRow, contactFieldMappings)
  const accountExample = mapColumnsToAccount(firstRow, accountFieldMappings)

  // Filter list fields that have CSV mappings
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
