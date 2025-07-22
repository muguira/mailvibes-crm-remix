import { useState } from 'react'
import { useAuth } from '@/components/auth'
import { Card } from '../../components/ui/card'
import { SettingsLayout } from '@/components/settings/SettingsLayout'

const Settings = () => {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState(user?.user_metadata?.firstName || '')
  const [lastName, setLastName] = useState(user?.user_metadata?.lastName || '')
  const [emailSignature, setEmailSignature] = useState('')

  const handleSaveBasicInfo = async () => {
    // TODO: Implement save functionality
  }

  return (
    <SettingsLayout title="Settings">
      <Card className="p-6 bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

        <div className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="firstName">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Verified Email Addresses</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-900">{user?.email}</span>
              <span className="text-green-500">✓</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="emailSignature">
              Email Signature
            </label>
            <textarea
              id="emailSignature"
              value={emailSignature}
              onChange={e => setEmailSignature(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email signature..."
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveBasicInfo}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Card>

      <div className="mt-8 flex items-center justify-between text-sm">
        <div className="flex gap-4">
          <a href="#" className="text-blue-600 hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="text-blue-600 hover:underline">
            Terms of Service
          </a>
        </div>
        <button className="text-red-600 hover:underline">Delete Your Account</button>
      </div>
    </SettingsLayout>
  )
}

export default Settings
