import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, CheckCircle, AlertCircle, Users, RefreshCw } from 'lucide-react'
import { GmailConnectDialog } from '@/components/integrations/gmail'
import { useGmail } from '@/hooks/gmail'
import { useAuth } from '@/components/auth'
import { getContactsCount } from '@/services/google/peopleApi'
import { getValidToken } from '@/services/google/tokenService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/utils/logger'
import { needsContactsPermission, generateScopeMessage } from '@/services/google/scopeDetection'

interface GmailAccountSelectStepProps {
  selectedAccountId: string | null
  onAccountSelect: (accountId: string, email: string) => void
  listName: string
  onListNameChange: (name: string) => void
  relationType: 'contacts' | 'accounts'
  onRelationTypeChange: (type: 'contacts' | 'accounts') => void
}

// Global flag to prevent multiple instances from loading at the same time
let globalLoadingAccounts = false

export function GmailAccountSelectStep({
  selectedAccountId,
  onAccountSelect,
  listName,
  onListNameChange,
  relationType,
  onRelationTypeChange,
}: GmailAccountSelectStepProps) {
  const { user } = useAuth()

  // Use the new Gmail hook instead of legacy store
  const {
    accounts: connectedAccounts,
    loading,
    loadAccounts,
    refreshAccounts,
    disconnectAccount,
  } = useGmail({
    userId: user?.id,
    enableLogging: true,
    autoInitialize: true,
  })

  const [contactsCounts, setContactsCounts] = useState<Record<string, number>>({})
  const [loadingCounts, setLoadingCounts] = useState<Record<string, boolean>>({})
  const [reconnectingAccount, setReconnectingAccount] = useState<string | null>(null)
  const hasLoadedAccountsRef = useRef(false)
  const loadedAccountIdsRef = useRef<Set<string>>(new Set())
  const componentId = useRef(Math.random().toString(36).substring(7))
  const reconnectButtonRef = useRef<HTMLButtonElement>(null)

  // Load accounts when component mounts - only once
  useEffect(() => {
    const loadAccountsOnce = async () => {
      if (user && !hasLoadedAccountsRef.current && !globalLoadingAccounts && !loading.accounts) {
        hasLoadedAccountsRef.current = true
        globalLoadingAccounts = true
        logger.debug(`[GmailAccountSelectStep-${componentId.current}] Loading accounts...`)

        try {
          await loadAccounts()
        } finally {
          globalLoadingAccounts = false
        }
      }
    }

    loadAccountsOnce()

    // Cleanup on unmount
    return () => {
      if (globalLoadingAccounts) {
        globalLoadingAccounts = false
      }
    }
  }, [user]) // Remove loadAccounts from dependencies to prevent infinite loop

  // Load contact counts for each account
  useEffect(() => {
    const loadContactCounts = async () => {
      if (!user) return

      for (const account of connectedAccounts) {
        // Skip if already loaded or loading
        if (loadedAccountIdsRef.current.has(account.id) || loadingCounts[account.id]) {
          continue
        }

        // Skip if account has a sync error (likely invalid token)
        // TODO: Check account sync error status
        // if (account.last_sync_error?.includes('Invalid refresh token')) {
        //   setContactsCounts(prev => ({ ...prev, [account.id]: -1 })); // -1 indicates error
        //   continue;
        // }

        loadedAccountIdsRef.current.add(account.id)
        setLoadingCounts(prev => ({ ...prev, [account.id]: true }))

        try {
          const token = await getValidToken(user.id, account.email)
          if (token) {
            const count = await getContactsCount(token)
            setContactsCounts(prev => ({ ...prev, [account.id]: count }))
          } else {
            // Token is null, mark as needs reconnection
            setContactsCounts(prev => ({ ...prev, [account.id]: -2 })) // -2 = no token
          }
        } catch (error) {
          console.error(`Error loading contacts count for ${account.email}:`, error)

          // Handle specific error types
          if (error instanceof Error) {
            if (error.message.includes('CONTACTS_PERMISSION_DENIED')) {
              setContactsCounts(prev => ({ ...prev, [account.id]: -1 })) // -1 = permission denied
            } else if (error.message.includes('CONTACTS_TOKEN_INVALID')) {
              setContactsCounts(prev => ({ ...prev, [account.id]: -2 })) // -2 = invalid token
            } else {
              setContactsCounts(prev => ({ ...prev, [account.id]: -3 })) // -3 = other error
            }
          } else {
            setContactsCounts(prev => ({ ...prev, [account.id]: -3 })) // -3 = unknown error
          }
        } finally {
          setLoadingCounts(prev => ({ ...prev, [account.id]: false }))
        }
      }
    }

    if (connectedAccounts.length > 0) {
      loadContactCounts()
    }
  }, [connectedAccounts, user]) // Remove getAccessToken and contactsCounts to prevent infinite loops

  const handleAccountConnected = (email: string) => {
    // Don't reload accounts here - the store will handle it after successful connection
    // This prevents potential loops
    logger.debug(`[GmailAccountSelectStep] Account connected: ${email}`)
    // The store will automatically refresh accounts after connection

    // If we were reconnecting, clear the state
    if (reconnectingAccount) {
      setReconnectingAccount(null)
      // Reset the contact count for this account so it tries to load again
      const account = connectedAccounts.find(a => a.email === email)
      if (account) {
        loadedAccountIdsRef.current.delete(account.id)
        setContactsCounts(prev => {
          const newCounts = { ...prev }
          delete newCounts[account.id]
          return newCounts
        })
      }
    }
  }

  const handleReconnectAccount = async (account: any) => {
    logger.debug(`[GmailAccountSelectStep] Starting reconnect for: ${account.email}`)
    setReconnectingAccount(account.id)

    try {
      // First disconnect the existing account
      if (user) {
        logger.debug(`[GmailAccountSelectStep] Disconnecting account: ${account.email}`)
        await disconnectAccount(account.email)

        // Wait a bit for the state to update
        await new Promise(resolve => setTimeout(resolve, 1000))

        logger.debug(`[GmailAccountSelectStep] Account disconnected, opening connect dialog`)
        setReconnectingAccount(null)

        // Click the hidden button to open the dialog
        if (reconnectButtonRef.current) {
          reconnectButtonRef.current.click()
        }
      }
    } catch (error) {
      logger.error(`[GmailAccountSelectStep] Error disconnecting account:`, error)
      setReconnectingAccount(null)
      toast.error('Failed to disconnect account. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Select a Gmail account to import contacts from</h2>
        <p className="text-gray-600 text-sm">
          Choose a connected Gmail account to import contacts from Google Contacts.
        </p>
      </div>

      {/* Gmail Accounts List */}
      <div className="space-y-3">
        <Label className="text-sm">Select Gmail Account</Label>

        {connectedAccounts.length === 0 ? (
          <Card className="p-4 text-center">
            <Mail className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 mb-3 text-sm">No Gmail accounts connected yet.</p>
            <GmailConnectDialog onSuccess={handleAccountConnected}>
              <Button size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Connect Gmail Account
              </Button>
            </GmailConnectDialog>
          </Card>
        ) : (
          <div className="space-y-2">
            <RadioGroup
              value={selectedAccountId || ''}
              onValueChange={id => {
                const account = connectedAccounts.find(a => a.id === id)
                if (account) {
                  onAccountSelect(id, account.email)
                }
              }}
            >
              {connectedAccounts.map(account => (
                <Card
                  key={account.id}
                  className={cn(
                    'p-3 cursor-pointer transition-colors',
                    selectedAccountId === account.id && 'border-[#62BFAA] bg-[#62BFAA]/5',
                  )}
                  onClick={() => onAccountSelect(account.id, account.email)}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={account.id} id={account.id} />

                    <Avatar className="h-8 w-8">
                      {account.picture ? <AvatarImage src={account.picture} alt={account.email} /> : null}
                      <AvatarFallback className="text-xs">{account.email.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={account.id} className="font-medium cursor-pointer text-sm">
                          {(account as any).user_info?.name || account.email}
                        </Label>
                        {account.sync_enabled ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{account.email}</p>

                      {/* Contact count */}
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-600">
                        <Users className="w-3 h-3" />
                        {loadingCounts[account.id] ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Loading contacts...</span>
                          </>
                        ) : contactsCounts[account.id] < 0 ? (
                          <span className="text-red-500">
                            {contactsCounts[account.id] === -1
                              ? 'Missing contacts permission - please reconnect'
                              : contactsCounts[account.id] === -2
                                ? 'Invalid token - please reconnect'
                                : 'Unable to load contacts - please reconnect'}
                          </span>
                        ) : (
                          <span>{contactsCounts[account.id] || 0} contacts available</span>
                        )}
                      </div>

                      {/* Show reconnect button if token is invalid */}
                      {(contactsCounts[account.id] === -1 ||
                        (account as any).last_sync_error?.includes('Invalid refresh token')) && (
                        <div className="mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleReconnectAccount(account)}
                            disabled={reconnectingAccount === account.id}
                          >
                            {reconnectingAccount === account.id ? (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                Disconnecting...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Reconnect Account
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </RadioGroup>

            <div className="text-center pt-1">
              <GmailConnectDialog onSuccess={handleAccountConnected}>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Connect Another Account
                </Button>
              </GmailConnectDialog>
            </div>
          </div>
        )}
      </div>

      {/* List Name Input */}
      <div className="space-y-1.5">
        <Label htmlFor="list-name" className="text-sm">
          Name a new list where contacts will be imported
        </Label>
        <input
          id="list-name"
          type="text"
          placeholder="My Gmail Contacts"
          value={listName}
          onChange={e => onListNameChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-md"
        />
      </div>

      {/* Relation Type Selection */}
      <div className="space-y-2">
        <Label className="text-sm">Do the relationships on this list associate with accounts or contacts?</Label>
        <RadioGroup
          value={relationType}
          onValueChange={value => onRelationTypeChange(value as 'contacts' | 'accounts')}
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="accounts" id="accounts" className="mt-0.5" />
            <div>
              <Label htmlFor="accounts" className="font-normal cursor-pointer text-sm">
                <span className="font-medium">Accounts</span> - Companies or departments within a company
              </Label>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="contacts" id="contacts" className="mt-0.5" />
            <div>
              <Label htmlFor="contacts" className="font-normal cursor-pointer text-sm">
                <span className="font-medium">Contacts</span> - The people with whom you interact daily
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Hidden connect dialog trigger for programmatic opening */}
      <div style={{ display: 'none' }}>
        <GmailConnectDialog onSuccess={handleAccountConnected}>
          <button ref={reconnectButtonRef}>Hidden Connect Trigger</button>
        </GmailConnectDialog>
      </div>
    </div>
  )
}
