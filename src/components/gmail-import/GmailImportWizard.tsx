import { useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Stepper, Step } from '@/components/ui/stepper'
import { ArrowRight, ArrowLeft, Check, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth'
import { useGmail } from '@/hooks/gmail'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { LoadingOverlay } from '@/components/ui/loading-spinner'
import { Breadcrumb, BreadcrumbItem } from '@/components/ui/breadcrumb'
import { useNavigate } from 'react-router-dom'

// Import existing components from CSV import
import { ContactPropertiesStep } from '@/components/csv-import/ContactPropertiesStep'
import { AccountPropertiesStep } from '@/components/csv-import/AccountPropertiesStep'
import { ListFieldsStep } from '@/components/csv-import/ListFieldsStep'
import { ReviewCompleteStep } from '@/components/csv-import/ReviewCompleteStep'
import { MultipleRowsActionModal } from '@/components/csv-import/MultipleRowsActionModal'

// Import Gmail specific components
import { GmailAccountSelectStep } from './GmailAccountSelectStep'
import { ImportSuccessStep } from './ImportSuccessStep'
import { ScopeDetectionAlert } from './ScopeDetectionAlert'
import { ContactsErrorAlert } from './ContactsErrorAlert'

// Import services
import { getAllContactsWithPagination, transformGoogleContactsToCsvFormat } from '@/services/google/peopleApi'
import { getValidToken } from '@/services/google/tokenService'
import { importCsvData, validateImportData } from '@/services/csvImportService'

// Import types
import { ParsedCsvResult } from '@/utils/parseCsv'
import { FieldMapping } from '@/utils/mapColumnsToContact'
import { AccountFieldMapping } from '@/utils/mapColumnsToAccount'
import { ListFieldDefinition } from '@/utils/buildFieldDefinitions'

const WIZARD_STEPS: Step[] = [
  { id: 'account-select', title: 'Select Account' },
  { id: 'contact-props', title: 'Contact Props' },
  { id: 'account-props', title: 'Account Props' },
  { id: 'list-fields', title: 'List Fields' },
  { id: 'review-complete', title: 'Review & Complete' },
  { id: 'import-complete', title: 'Import Complete' },
]

export interface ImportData {
  accountEmail: string
  listName: string
  relationType: 'contacts' | 'accounts'
  parsedData: ParsedCsvResult
  contactFieldMappings: FieldMapping[]
  accountFieldMappings: AccountFieldMapping[]
  listFieldDefinitions: ListFieldDefinition[]
}

export interface GmailImportWizardProps {
  onComplete?: (data: ImportData, listId: string | null) => void
}

export function GmailImportWizard({ onComplete }: GmailImportWizardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Track initial loading state to prevent flash of error screen
  const [isInitializing, setIsInitializing] = useState(true)
  const hasTriedInitRef = useRef(false)

  // Use the new Gmail hook with auto-initialization
  const { accounts, primaryAccount, importContacts, loading, error, loadAccounts, reset } = useGmail({
    userId: user?.id, // Pass user ID for auto-initialization
    enableLogging: true, // Enable logging to debug issues
    autoInitialize: true, // Enable auto-init for service availability
  })

  // Manual retry function for service initialization
  const handleRetryService = useCallback(async () => {
    if (!user?.id) {
      logger.error('[GmailImportWizard] Cannot retry: User not authenticated')
      return
    }

    logger.info('[GmailImportWizard] Manually retrying service initialization...', { userId: user.id })

    try {
      // Reset the current state first
      reset()

      // Wait a bit for the reset to take effect
      await new Promise(resolve => setTimeout(resolve, 500))

      // Force re-initialization by calling loadAccounts which should trigger service init
      await loadAccounts()

      logger.info('[GmailImportWizard] Manual service retry successful')
    } catch (error) {
      logger.error('[GmailImportWizard] Manual service retry failed:', error)
    }
  }, [user?.id, reset, loadAccounts])

  // Add debugging info about the current state
  useEffect(() => {
    logger.info('[GmailImportWizard] State update:', {
      hasUser: !!user?.id,
      userId: user?.id,
      error,
      accountsCount: accounts?.length || 0,
      loading,
      isInitializing,
    })
  }, [user?.id, error, accounts?.length, loading, isInitializing])

  // Manage initial loading state - give service time to initialize
  useEffect(() => {
    if (!user?.id) return // Wait for user to be available

    if (!hasTriedInitRef.current) {
      hasTriedInitRef.current = true

      // Give the service 3 seconds to initialize before showing any errors
      const initTimeoutId = setTimeout(() => {
        setIsInitializing(false)
      }, 3000)

      return () => clearTimeout(initTimeoutId)
    }
  }, [user?.id])

  // End initialization state once we have accounts or a non-initialization error
  useEffect(() => {
    if (accounts.length > 0) {
      setIsInitializing(false)
    } else if (error && !error.includes('Service not initialized') && !loading.accounts) {
      setIsInitializing(false)
    }
  }, [accounts.length, error, loading.accounts])

  // Auto-retry service initialization if needed
  useEffect(() => {
    if (user?.id && error?.includes('Service not initialized')) {
      logger.info('[GmailImportWizard] Auto-retrying due to service initialization error...')

      // Retry after a short delay
      const timeoutId = setTimeout(() => {
        handleRetryService()
      }, 1000)

      return () => clearTimeout(timeoutId)
    }
  }, [user?.id, error, handleRetryService])

  // Force service initialization when user becomes available
  useEffect(() => {
    if (user?.id && !loading.accounts && !error && accounts.length === 0) {
      logger.info('[GmailImportWizard] User available but no accounts loaded, forcing initialization...')

      const timeoutId = setTimeout(async () => {
        try {
          await loadAccounts()
        } catch (err) {
          logger.error('[GmailImportWizard] Failed to load accounts on user available:', err)
        }
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [user?.id, loading.accounts, error, accounts.length, loadAccounts])

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [selectedAccountEmail, setSelectedAccountEmail] = useState<string>('')
  const [listName, setListName] = useState('')
  const [relationType, setRelationType] = useState<'contacts' | 'accounts'>('accounts')
  const [isProcessing, setIsProcessing] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [multipleRowsAction, setMultipleRowsAction] = useState<'multiple' | 'merge'>('multiple')
  const [showMultipleRowsModal, setShowMultipleRowsModal] = useState(false)

  // Import result state
  const [importResult, setImportResult] = useState<{
    contactsCreated: number
    contactsUpdated: number
    contactsSkipped: number
    errors: string[]
    listId: string | null
  } | null>(null)

  // Data states
  const [googleContacts, setGoogleContacts] = useState<any[]>([])
  const [parsedData, setParsedData] = useState<ParsedCsvResult | null>(null)
  const [fetchProgress, setFetchProgress] = useState(0)

  // Field mappings for each step
  const [contactFieldMappings, setContactFieldMappings] = useState<FieldMapping[]>([])
  const [accountFieldMappings, setAccountFieldMappings] = useState<AccountFieldMapping[]>([])
  const [listFieldDefinitions, setListFieldDefinitions] = useState<ListFieldDefinition[]>([])

  // Validation states
  const [isContactStepValid, setIsContactStepValid] = useState(false)
  const [isAccountStepValid, setIsAccountStepValid] = useState(false)
  const [isListFieldsValid, setIsListFieldsValid] = useState(false)

  // Track if we've already fetched contacts for current account
  const fetchedForAccountRef = useRef<string | null>(null)

  // Fetch actual Google contacts data when moving to contact props step
  useEffect(() => {
    const fetchGoogleContacts = async () => {
      // Skip if we've already fetched for this account
      if (fetchedForAccountRef.current === selectedAccountEmail) {
        return
      }

      if (currentStep === 1 && selectedAccountId && selectedAccountEmail && !parsedData && user) {
        setIsProcessing(true)
        setFetchProgress(0)
        fetchedForAccountRef.current = selectedAccountEmail

        try {
          logger.info(`[GmailImportWizard] Fetching Google contacts directly from API`)

          // Get access token for the selected account
          const token = await getValidToken(user.id, selectedAccountEmail)
          if (!token) {
            throw new Error('Unable to get valid access token for the selected account')
          }

          // Fetch contacts directly from Google People API
          const contacts = await getAllContactsWithPagination(token, (current, total) => {
            const progress = Math.round((current / total) * 100)
            setFetchProgress(current)
            logger.debug(`[GmailImportWizard] Fetching progress: ${current}/${total} contacts`)
          })

          if (contacts.length === 0) {
            throw new Error('No contacts found in this Google account')
          }

          // Transform Google contacts to CSV format for the wizard
          const csvData = transformGoogleContactsToCsvFormat(contacts)

          setParsedData(csvData)
          setGoogleContacts(contacts)

          logger.info(`[GmailImportWizard] Successfully fetched ${contacts.length} contacts from Google`)
          toast.success(`Successfully loaded ${contacts.length} contacts from Gmail`)
        } catch (error) {
          logger.error('Error fetching Google contacts:', error)
          toast.error('Failed to fetch contacts', {
            description: error instanceof Error ? error.message : 'Unknown error occurred',
          })
          // Reset the fetched account ref on error
          fetchedForAccountRef.current = null
          // Go back to account selection
          setCurrentStep(0)
        } finally {
          setIsProcessing(false)
          setFetchProgress(0)
        }
      }
    }

    fetchGoogleContacts()
  }, [currentStep, selectedAccountId, selectedAccountEmail, parsedData, user])

  const handleAccountSelect = (accountId: string, email: string) => {
    setSelectedAccountId(accountId)
    setSelectedAccountEmail(email)
    // Reset fetched account ref when selecting a new account
    if (email !== fetchedForAccountRef.current) {
      fetchedForAccountRef.current = null
      setParsedData(null)
      setGoogleContacts([])
    }
  }

  const canProceedToNext = useCallback(() => {
    switch (currentStep) {
      case 0:
        return selectedAccountId !== null && listName.trim() !== ''
      case 1:
        return isContactStepValid
      case 2:
        return true // Account props are optional
      case 3:
        return isListFieldsValid
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }, [currentStep, selectedAccountId, listName, isContactStepValid, isListFieldsValid])

  const handleNext = async () => {
    if (canProceedToNext()) {
      if (currentStep === 4) {
        // Review step
        // Check if we need to show multiple rows modal
        if (hasMultipleRowsPerAccount() && !showMultipleRowsModal) {
          setShowMultipleRowsModal(true)
        } else {
          await handleCompleteImport()
        }
      } else {
        setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1))
      }
    }
  }

  const hasMultipleRowsPerAccount = () => {
    if (!parsedData || !accountFieldMappings.length) return false

    const accountNameMapping = accountFieldMappings.find(m => m.accountProperty === 'name')
    if (!accountNameMapping) return false

    const accountCounts: Record<string, number> = {}
    parsedData.rows.forEach(row => {
      const accountName = row[accountNameMapping.csvField]
      if (accountName) {
        accountCounts[accountName] = (accountCounts[accountName] || 0) + 1
      }
    })

    return Object.values(accountCounts).some(count => count > 1)
  }

  const handleCompleteImport = async () => {
    if (!parsedData || !user) return

    // Validate data
    const validation = validateImportData(parsedData, contactFieldMappings, listFieldDefinitions)
    if (!validation.isValid) {
      toast.error('Validation failed', {
        description: validation.errors.join(', '),
      })
      return
    }

    setIsProcessing(true)
    setImportProgress(0)

    try {
      const result = await importCsvData(
        parsedData,
        contactFieldMappings,
        accountFieldMappings,
        listFieldDefinitions,
        listName,
        relationType,
        user.id,
        progress => setImportProgress(progress),
        multipleRowsAction,
      )

      // Update import result state
      setImportResult(result)

      // Advance to the success step
      setCurrentStep(5)
    } catch (error: any) {
      toast.error('Import failed', {
        description: error.message || 'An unexpected error occurred',
      })
    } finally {
      setIsProcessing(false)
      setImportProgress(0)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const handleEditStep = (step: number) => {
    setCurrentStep(step)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <GmailAccountSelectStep
            selectedAccountId={selectedAccountId}
            onAccountSelect={handleAccountSelect}
            listName={listName}
            onListNameChange={setListName}
            relationType={relationType}
            onRelationTypeChange={setRelationType}
          />
        )

      case 1:
        return parsedData ? (
          <ContactPropertiesStep
            parsedData={parsedData}
            onMappingsChange={setContactFieldMappings}
            onValidationChange={setIsContactStepValid}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Mail className="w-12 h-12 text-gray-400 animate-pulse" />
            <p className="text-gray-500">Fetching contacts from Google Contacts...</p>
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#62BFAA] h-2 rounded-full transition-all"
                style={{ width: fetchProgress > 0 ? `${Math.min((fetchProgress / 1000) * 100, 100)}%` : '10%' }}
              />
            </div>
            <p className="text-sm text-gray-400">{fetchProgress} contacts loaded</p>
          </div>
        )

      case 2:
        return parsedData ? (
          <AccountPropertiesStep
            parsedData={parsedData}
            onMappingsChange={setAccountFieldMappings}
            onValidationChange={setIsAccountStepValid}
          />
        ) : null

      case 3:
        return parsedData ? (
          <ListFieldsStep
            parsedData={parsedData}
            accountFieldMappings={accountFieldMappings}
            relationType={relationType}
            onFieldsChange={setListFieldDefinitions}
            onValidationChange={setIsListFieldsValid}
          />
        ) : null

      case 4:
        return parsedData ? (
          <ReviewCompleteStep
            parsedData={parsedData}
            contactFieldMappings={contactFieldMappings}
            accountFieldMappings={accountFieldMappings}
            listFieldDefinitions={listFieldDefinitions}
            relationType={relationType}
            onEditStep={handleEditStep}
          />
        ) : null

      case 5:
        return importResult ? (
          <ImportSuccessStep
            contactsCreated={importResult.contactsCreated}
            contactsUpdated={importResult.contactsUpdated}
            contactsSkipped={importResult.contactsSkipped}
            errors={importResult.errors}
            accountEmail={selectedAccountEmail}
            listName={listName}
            onViewContacts={() => {
              if (onComplete) {
                onComplete(
                  {
                    accountEmail: selectedAccountEmail,
                    listName,
                    relationType,
                    parsedData: parsedData!,
                    contactFieldMappings,
                    accountFieldMappings,
                    listFieldDefinitions,
                  },
                  importResult.listId,
                )
              }
            }}
          />
        ) : null

      default:
        return null
    }
  }

  const shouldShowSkipButton = () => {
    return currentStep === 1 || currentStep === 2
  }

  // Show loading state during initial service initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <LoadingOverlay show={true} />
            <Mail className="w-16 h-16 mx-auto text-blue-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Initializing Gmail Service</h2>
            <p className="text-gray-600 mb-4">Setting up your Gmail integration...</p>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              This may take a few seconds
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Show error state if Gmail service has issues
  if (error && !isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <Mail className="w-16 h-16 mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Gmail Service Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            {error.includes('Service not initialized') && (
              <p className="text-sm text-gray-500 mb-6">
                This usually happens when your Gmail account needs to be reconnected with the proper permissions. Please
                try connecting or reconnecting your Gmail account in the Settings → Integrations page.
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button onClick={handleRetryService}>Retry</Button>
              <Button variant="outline" onClick={() => navigate('/settings/integrations')}>
                Go to Integrations
              </Button>
              <Button variant="outline" onClick={() => navigate('/settings/imports')}>
                Back to Imports
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      label: 'Imports',
      onClick: () => navigate('/settings/imports'),
    },
    {
      label: 'Gmail',
      isActive: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingOverlay
        show={isProcessing}
        message={currentStep === 1 ? 'Importing contacts from Gmail...' : 'Processing import...'}
      />

      {/* Multiple Rows Modal */}
      {showMultipleRowsModal && (
        <MultipleRowsActionModal
          isOpen={showMultipleRowsModal}
          onClose={() => setShowMultipleRowsModal(false)}
          onConfirm={action => {
            setMultipleRowsAction(action)
            setShowMultipleRowsModal(false)
            handleCompleteImport()
          }}
        />
      )}

      <div className="max-w-6xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Gmail Import</h1>
          <p className="text-gray-600 mt-2">Import contacts from your Gmail account and organize them into lists</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper steps={WIZARD_STEPS} currentStep={currentStep} />
        </div>

        {/* Scope Detection Alert - Temporarily disabled to fix scope detection issues */}
        {/* {user?.id && selectedAccountEmail && (
          <ScopeDetectionAlert 
            userId={user.id}
            email={selectedAccountEmail}
            onReconnectSuccess={() => {
              // Refresh the accounts list and reset wizard state
              setSelectedAccountId(null)
              setSelectedAccountEmail("")
              setTimeout(() => {
                window.location.reload()
              }, 1000)
            }}
            className="mb-6"
          />
        )} */}

        {/* Contacts Error Alert - Show specific errors for contacts loading */}
        {error && error.includes('CONTACTS_PERMISSION_DENIED') && selectedAccountEmail && (
          <ContactsErrorAlert
            errorCode={-1}
            accountEmail={selectedAccountEmail}
            onReconnectSuccess={() => {
              setSelectedAccountId(null)
              setSelectedAccountEmail('')
              setTimeout(() => window.location.reload(), 1000)
            }}
          />
        )}

        {error && error.includes('CONTACTS_TOKEN_INVALID') && selectedAccountEmail && (
          <ContactsErrorAlert
            errorCode={-2}
            accountEmail={selectedAccountEmail}
            onReconnectSuccess={() => {
              setSelectedAccountId(null)
              setSelectedAccountEmail('')
              setTimeout(() => window.location.reload(), 1000)
            }}
          />
        )}

        {/* Main Content */}
        <Card>
          <CardContent className="p-8">
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0 || isProcessing}
                className={cn(currentStep === 0 && 'invisible')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                {shouldShowSkipButton() && (
                  <Button variant="ghost" onClick={handleNext} disabled={isProcessing}>
                    Skip
                  </Button>
                )}

                {currentStep < WIZARD_STEPS.length - 1 && (
                  <Button onClick={handleNext} disabled={!canProceedToNext() || isProcessing}>
                    {currentStep === 4 ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Complete Import
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
