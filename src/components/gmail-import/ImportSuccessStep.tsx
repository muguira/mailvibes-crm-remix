import React from 'react'
import { CheckCircle2, Users, UserPlus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ImportSuccessStepProps {
  contactsCreated: number
  contactsUpdated: number
  contactsSkipped: number
  errors: string[]
  accountEmail: string
  listName: string
  onViewContacts: () => void
}

export function ImportSuccessStep({
  contactsCreated,
  contactsUpdated,
  contactsSkipped,
  errors,
  accountEmail,
  listName,
  onViewContacts,
}: ImportSuccessStepProps) {
  const totalProcessed = contactsCreated + contactsUpdated

  return (
    <div className="space-y-6">
      {/* Success Icon and Title */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 rounded-full p-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Import Completed Successfully!</h2>
        <p className="text-gray-600">Your contacts from {accountEmail} have been imported</p>
      </div>

      {/* Import Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <div className="flex justify-center mb-2">
            <UserPlus className="w-8 h-8 text-[#62BFAA]" />
          </div>
          <div className="text-2xl font-semibold text-gray-900">{contactsCreated}</div>
          <div className="text-sm text-gray-600">New Contacts</div>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex justify-center mb-2">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-2xl font-semibold text-gray-900">{contactsUpdated}</div>
          <div className="text-sm text-gray-600">Updated Contacts</div>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-2xl font-semibold text-gray-900">{contactsSkipped}</div>
          <div className="text-sm text-gray-600">Skipped</div>
        </Card>
      </div>

      {/* Summary Message */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Import Summary</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• Total contacts processed: {totalProcessed}</li>
          <li>• Import list name: "{listName}"</li>
          <li>• Source: {accountEmail}</li>
        </ul>
      </div>

      {/* Errors Section (if any) */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Some errors occurred during import
          </h3>
          <ul className="space-y-1 text-sm text-red-700">
            {errors.slice(0, 5).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
            {errors.length > 5 && <li className="text-red-600 font-medium">... and {errors.length - 5} more errors</li>}
          </ul>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <Button onClick={onViewContacts} size="lg" className="bg-[#62BFAA] hover:bg-[#52AF9A] text-white px-8">
          <Users className="w-5 h-5 mr-2" />
          View Imported Contacts
        </Button>
      </div>
    </div>
  )
}
