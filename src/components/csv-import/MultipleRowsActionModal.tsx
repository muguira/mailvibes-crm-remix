import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'

interface MultipleRowsActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (action: 'multiple' | 'merge') => void
}

export function MultipleRowsActionModal({ isOpen, onClose, onConfirm }: MultipleRowsActionModalProps) {
  const [selectedAction, setSelectedAction] = useState<'multiple' | 'merge'>('multiple')

  const handleConfirm = () => {
    onConfirm(selectedAction)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="bg-[#62BFAA] text-white px-4 py-3 -mx-6 -mt-6 rounded-t-lg">
            <DialogTitle className="text-white font-medium">Select Action for Accounts on Multiple Rows</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-gray-600">Your CSV has instances of multiple rows of data per account. For example:</p>

          {/* Example table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Account Name</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Owner</th>
                  <th className="text-left p-2">Contact Name</th>
                  <th className="text-left p-2">Estimated Deal Size</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">RelateIQ</td>
                  <td className="p-2">Lead</td>
                  <td className="p-2">Bob Jones</td>
                  <td className="p-2">Malcolm McDonald</td>
                  <td className="p-2">$700,000</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">RelateIQ</td>
                  <td className="p-2">Discovered</td>
                  <td className="p-2">Jane Smith</td>
                  <td className="p-2">Cathy Collins</td>
                  <td className="p-2">$600,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-gray-600 font-medium">What action should be taken for rows that have the same account?</p>

          <RadioGroup value={selectedAction} onValueChange={value => setSelectedAction(value as 'multiple' | 'merge')}>
            <div className="space-y-6">
              {/* Create multiple relationships option */}
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="multiple" className="font-medium cursor-pointer">
                      Create multiple relationships
                    </Label>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                      <li>
                        Two relationships will be created with the same account, each with a single point of contact.
                      </li>
                      <li>All data from your CSV will be imported.</li>
                    </ul>
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md flex gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-700">
                        Duplicate accounts may be created if data associated with account properties is different across
                        rows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-gray-400 font-medium">OR</div>

              {/* Merge data option */}
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="merge" id="merge" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="merge" className="font-medium cursor-pointer">
                      Merge data
                    </Label>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                      <li>
                        One relationship will be created per account, with the associated points of contact tied to that
                        account.
                      </li>
                      <li>Data associated with a contact property will be maintained for all contacts.</li>
                    </ul>
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md flex gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-700">
                        Data that is not associated with a contact property will be lost for all rows except for the
                        first row associated with the account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button onClick={handleConfirm} className="bg-[#62BFAA] hover:bg-[#52AF9A] text-white">
            Next
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
