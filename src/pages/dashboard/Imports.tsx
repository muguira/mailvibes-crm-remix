import { useState } from 'react'
import { useAuth } from '@/components/auth'
import { Card } from '../../components/ui/card'
import { TopNavbar } from '../../components/layout/top-navbar'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Upload, Mail, FileSpreadsheet, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Import integration images
import GmailLogo from '../../components/svgs/integrations-images/gmail-logo.svg'

interface ImportOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  logoComponent?: string
  route: string
  features: string[]
}

const Imports = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const importOptions: ImportOption[] = [
    {
      id: 'csv',
      name: 'CSV Import',
      description: 'Import contacts from a CSV file. Map your columns to contact fields and create custom properties.',
      icon: <FileSpreadsheet className="w-8 h-8 text-[#62BFAA]" />,
      route: '/import',
      features: [
        'Upload CSV files up to 50MB',
        'Map columns to contact fields',
        'Create custom properties',
        'Preview before importing',
        'Handle duplicates automatically',
      ],
    },
    {
      id: 'gmail',
      name: 'Gmail Import',
      description:
        'Import contacts directly from your Google Contacts. Connect your Gmail account and sync your contacts.',
      icon: <Mail className="w-8 h-8" />,
      logoComponent: GmailLogo,
      route: '/gmail-import',
      features: [
        'Import from Google Contacts',
        'Sync contact photos and details',
        'Automatic field mapping',
        'Import into lists',
        'One-click import process',
      ],
    },
  ]

  return (
    <>
      <TopNavbar />
      <div className="min-h-screen bg-gray-50 pt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-semibold mb-8">Settings</h1>

          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">My Account Settings</h2>
                    <nav className="space-y-1">
                      <button
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm rounded-md transition-colors',
                          isActive('/settings')
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        )}
                        onClick={() => navigate('/settings')}
                      >
                        Your Information
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Security
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Notifications
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Connected Accounts
                      </button>
                    </nav>
                  </div>

                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">Organization Settings</h2>
                    <nav className="space-y-1">
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        General
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Sharing
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Lists
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Users
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Teams
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Billing
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        Account Properties
                      </button>
                      <button
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm rounded-md transition-colors',
                          isActive('/settings/integrations')
                            ? 'bg-gray-100 text-gray-900 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        )}
                        onClick={() => navigate('/settings/integrations')}
                      >
                        Integrations
                      </button>
                      <button
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm rounded-md transition-colors',
                          isActive('/settings/imports')
                            ? 'bg-[#E8F5F3] text-[#00A991] font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                        )}
                        onClick={() => navigate('/settings/imports')}
                      >
                        Imports
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <Card className="p-6 bg-white shadow-sm mb-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold mb-2">Import Contacts</h2>
                  <p className="text-gray-600">Choose how you want to import your contacts into Mailvibes CRM</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {importOptions.map(option => (
                    <Card
                      key={option.id}
                      className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-[#62BFAA]/50"
                      onClick={() => navigate(option.route)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {option.logoComponent ? (
                            <img
                              src={option.logoComponent}
                              alt={`${option.name} logo`}
                              className="w-10 h-10 object-contain"
                            />
                          ) : (
                            option.icon
                          )}
                          <div>
                            <h3 className="text-lg font-semibold">{option.name}</h3>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>

                      <p className="text-gray-600 text-sm mb-4">{option.description}</p>

                      <div className="space-y-2">
                        {option.features.map((feature, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="w-full mt-6 bg-[#62BFAA] hover:bg-[#52AF9A] text-white"
                        onClick={e => {
                          e.stopPropagation()
                          navigate(option.route)
                        }}
                      >
                        Start {option.name}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </Card>

              {/* Recent Import History */}
              <Card className="p-6 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Recent Imports</h3>
                <div className="text-sm text-gray-600">
                  <p>No recent imports found. Start by importing contacts using one of the methods above.</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Imports
