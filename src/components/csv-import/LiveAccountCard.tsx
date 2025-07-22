import React from 'react'
import { Building2 } from 'lucide-react'
import { AccountInsert } from '@/utils/mapColumnsToAccount'

interface CustomPropertyValue {
  id: string
  label: string
  value?: string
}

interface LiveAccountCardProps {
  account: Partial<AccountInsert>
  customProperties?: CustomPropertyValue[]
}

export function LiveAccountCard({ account, customProperties = [] }: LiveAccountCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-hidden">
      <h3 className="text-lg font-medium text-gray-900">Example Account Data</h3>

      <div className="flex items-start gap-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
          <Building2 className="w-8 h-8 text-gray-400" />
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          {/* Account Name */}
          <div>
            <div className="text-xs text-gray-500 italic">Account Name</div>
            <div className="text-sm text-gray-900 break-words">{account.name || '-'}</div>
          </div>

          {/* Address */}
          <div>
            <div className="text-xs text-gray-500 italic">Address</div>
            <div className="text-sm text-gray-900 break-words">{account.address || '-'}</div>
          </div>

          {/* Primary Contact */}
          <div>
            <div className="text-xs text-gray-500 italic">Primary Contact</div>
            <div className="text-sm text-gray-900 break-words">{account.primaryContact || '-'}</div>
          </div>

          {/* Industry */}
          <div>
            <div className="text-xs text-gray-500 italic">Industry</div>
            <div className="text-sm text-gray-900 break-words">{account.industry || '-'}</div>
          </div>

          {/* Custom Properties */}
          {customProperties.map(property => (
            <div key={property.id}>
              <div className="text-xs text-gray-500 italic">{property.label}</div>
              <div className="text-sm text-gray-900 break-words">{property.value || '-'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
