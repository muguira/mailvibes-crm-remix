import React, { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Settings } from 'lucide-react'
import { useGmailScopeDetection } from '@/hooks/gmail/useGmailScopeDetection'
import { GmailConnectDialog } from '@/components/integrations/gmail'
import { useNavigate } from 'react-router-dom'

interface ScopeDetectionAlertProps {
  userId: string
  email: string
  onReconnectSuccess?: () => void
  className?: string
}

/**
 * Component that automatically detects missing OAuth scopes
 * and provides a user-friendly reconnection interface
 */
export function ScopeDetectionAlert({ 
  userId, 
  email, 
  onReconnectSuccess,
  className = ""
}: ScopeDetectionAlertProps) {
  const { checkAllScopes, checkContactsPermission, loading } = useGmailScopeDetection({ enableLogging: true })
  const navigate = useNavigate()
  const [scopeStatus, setScopeStatus] = useState<{
    hasAllScopes: boolean
    userMessage: string
    isTokenError?: boolean
  } | null>(null)

  // Check scopes when component mounts - but only check contacts scope for import page
  useEffect(() => {
    const checkScopes = async () => {
      if (userId && email) {
        try {
          // Only check contacts permission specifically, not all scopes
          const hasContactsPermission = await checkContactsPermission(userId, email)
          
          if (hasContactsPermission) {
            // Don't show alert if contacts permission is available
            setScopeStatus({
              hasAllScopes: true,
              userMessage: 'All required permissions are available'
            })
          } else {
            setScopeStatus({
              hasAllScopes: false,
              userMessage: 'Missing Google Contacts permission. Please reconnect to enable contact import.',
              isTokenError: false
            })
          }
        } catch (error) {
          console.error('[ScopeDetectionAlert] Error checking scopes:', error)
          // Show a generic connection error
          setScopeStatus({
            hasAllScopes: false,
            userMessage: 'Unable to verify Gmail permissions. Please check your connection.',
            isTokenError: true
          })
        }
      }
    }

    checkScopes()
  }, [userId, email, checkContactsPermission])

  const handleReconnectSuccess = () => {
    // Recheck scopes after successful reconnection
    setScopeStatus(null)
    if (onReconnectSuccess) {
      onReconnectSuccess()
    }
  }

  // Don't show anything if we're loading or have all scopes
  if (loading || !scopeStatus || scopeStatus.hasAllScopes) {
    return null
  }

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <strong className="text-amber-800">
            {scopeStatus.isTokenError ? 'Conexión Gmail Requerida' : 'Permisos Adicionales Requeridos'}
          </strong>
          <p className="text-amber-700 mt-1">{scopeStatus.userMessage}</p>
        </div>
        <div className="flex gap-2">
          {scopeStatus.isTokenError && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/settings/integrations')}
              className="border-amber-300 text-amber-700 hover:bg-amber-100 flex items-center gap-2"
            >
              <Settings className="h-3 w-3" />
              Ir a Integraciones
            </Button>
          )}
          <GmailConnectDialog onSuccess={handleReconnectSuccess}>
            <Button 
              variant="outline" 
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              {scopeStatus.isTokenError ? 'Conectar Cuenta' : 'Reconectar Cuenta'}
            </Button>
          </GmailConnectDialog>
        </div>
      </AlertDescription>
    </Alert>
  )
} 