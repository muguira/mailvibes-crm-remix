import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { GmailConnectDialog } from '@/components/integrations/gmail'

interface ContactsErrorAlertProps {
  errorCode: number
  accountEmail: string
  onReconnectSuccess?: () => void
}

export function ContactsErrorAlert({ 
  errorCode, 
  accountEmail, 
  onReconnectSuccess 
}: ContactsErrorAlertProps) {
  const getErrorMessage = (code: number) => {
    switch (code) {
      case -1:
        return {
          title: "Permisos de Contactos Faltantes",
          message: "Esta cuenta de Gmail no tiene permisos para acceder a contactos. Necesitas reconectar la cuenta con todos los permisos.",
          showReconnect: true
        }
      case -2:
        return {
          title: "Token Inválido",
          message: "El token de autenticación ha expirado o es inválido. Necesitas reconectar la cuenta.",
          showReconnect: true
        }
      case -3:
        return {
          title: "Error de Conexión",
          message: "No se pudo conectar con Google. Verifica tu conexión a internet e intenta nuevamente.",
          showReconnect: true
        }
      default:
        return {
          title: "Error Desconocido",
          message: "Ocurrió un error inesperado. Intenta reconectar la cuenta.",
          showReconnect: true
        }
    }
  }

  const errorInfo = getErrorMessage(errorCode)

  if (errorCode >= 0) {
    return null // No error
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 mb-4">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <strong className="text-amber-800">{errorInfo.title}</strong>
          <p className="text-amber-700 mt-1">{errorInfo.message}</p>
          <p className="text-amber-600 text-sm mt-1">Cuenta: {accountEmail}</p>
        </div>
        {errorInfo.showReconnect && (
          <GmailConnectDialog onSuccess={onReconnectSuccess}>
            <Button 
              variant="outline" 
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Reconectar Cuenta
            </Button>
          </GmailConnectDialog>
        )}
      </AlertDescription>
    </Alert>
  )
} 