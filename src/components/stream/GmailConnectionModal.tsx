import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  RefreshCw,
  Settings,
  WifiOff,
  Plus,
  Mail
} from "lucide-react";
import { getConnectedAccounts, forceTokenRefresh, getTokenDiagnostics, testTokenAutoRefresh } from "@/services/google/tokenService";
import { useStore } from "@/stores";
import { toast } from "sonner";
import { GmailConnectDialog } from '@/components/integrations/gmail/GmailConnectDialog';
import { useHybridContactEmails } from "@/hooks/use-hybrid-contact-emails";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Database, 
  Globe, 
  Wifi
} from "lucide-react";

interface GmailConnectionStatus {
  isConnected: boolean;
  email?: string;
  tokenExpiresAt?: Date;
  lastSyncAt?: Date;
  lastSyncStatus?: string;
  lastSyncError?: string;
  needsReconnection: boolean;
}

interface GmailConnectionModalProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  contactEmail?: string;
}

export function GmailConnectionModal({ children, onRefresh, contactEmail }: GmailConnectionModalProps) {
  const { authUser } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailConnectionStatus>({
    isConnected: false,
    needsReconnection: false
  });
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isTestingAutoRefresh, setIsTestingAutoRefresh] = useState(false);

  // Use hybrid emails hook if contactEmail is provided
  const hybridEmails = useHybridContactEmails(contactEmail ? {
    contactEmail,
    maxResults: 20,
    autoFetch: true,
  } : undefined);

  // Check Gmail connection status
  useEffect(() => {
    if (!isOpen) return;

    const checkGmailStatus = async () => {
      if (!authUser?.id) return;

      try {
        const accounts = await getConnectedAccounts(authUser.id);
        const gmailAccount = accounts.find(acc => acc.provider === 'gmail');
        
        if (gmailAccount) {
          const now = new Date();
          const tokenExpiresAt = gmailAccount.token_expires_at;
          const isTokenExpired = tokenExpiresAt ? tokenExpiresAt.getTime() <= now.getTime() : false;
          const needsReconnection = !gmailAccount.sync_enabled || 
                                  gmailAccount.last_sync_at === null || 
                                  isTokenExpired;

          setGmailStatus({
            isConnected: gmailAccount.is_connected && !needsReconnection,
            email: gmailAccount.email,
            tokenExpiresAt: gmailAccount.token_expires_at,
            lastSyncAt: gmailAccount.last_sync_at,
            lastSyncStatus: 'connected',
            lastSyncError: null,
            needsReconnection
          });

          // Get detailed diagnostics if showing diagnostics
          if (showDiagnostics) {
            const diag = await getTokenDiagnostics(authUser.id, gmailAccount.email);
            setDiagnostics(diag);
          }
        } else {
          setGmailStatus({
            isConnected: false,
            needsReconnection: true
          });
          setDiagnostics(null);
        }
      } catch (error) {
        console.error('Error checking Gmail status:', error);
        setGmailStatus({
          isConnected: false,
          needsReconnection: true
        });
        setDiagnostics(null);
      }
    };

    checkGmailStatus();
    
    // Check status every 10 seconds while modal is open
    const interval = setInterval(checkGmailStatus, 10000);
    return () => clearInterval(interval);
  }, [authUser?.id, isOpen, showDiagnostics]);

  const handleTokenRefresh = async () => {
    if (!authUser?.id || !gmailStatus.email) return;

    setIsRefreshingToken(true);
    try {
      const newToken = await forceTokenRefresh(authUser.id, gmailStatus.email);
      if (newToken) {
        toast.success('Token renovado exitosamente');
        // Refresh the status
        const accounts = await getConnectedAccounts(authUser.id);
        const gmailAccount = accounts.find(acc => acc.provider === 'gmail');
        if (gmailAccount) {
          setGmailStatus(prev => ({
            ...prev,
            isConnected: true,
            needsReconnection: false,
            tokenExpiresAt: gmailAccount.token_expires_at
          }));
        }
        
        // Call parent refresh if provided
        if (onRefresh) {
          onRefresh();
        }

        // Refresh hybrid emails if available
        if (hybridEmails?.refresh) {
          hybridEmails.refresh();
        }
      } else {
        toast.error('No se pudo renovar el token. Necesitas reconectar tu cuenta de Gmail.');
        setGmailStatus(prev => ({
          ...prev,
          needsReconnection: true
        }));
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Error al renovar el token');
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleTestAutoRefresh = async () => {
    if (!authUser?.id || !gmailStatus.email) return;

    setIsTestingAutoRefresh(true);
    try {
      const result = await testTokenAutoRefresh(authUser.id, gmailStatus.email);
      if (result) {
        toast.success('Auto-refresh funciona correctamente');
      } else {
        toast.error('Auto-refresh falló. Puede que necesites reconectar.');
      }
      
      // Refresh diagnostics
      const diag = await getTokenDiagnostics(authUser.id, gmailStatus.email);
      setDiagnostics(diag);
    } catch (error) {
      console.error('Error testing auto-refresh:', error);
      toast.error('Error al probar auto-refresh');
    } finally {
      setIsTestingAutoRefresh(false);
    }
  };

  const handleConnectGmail = () => {
    // Close modal and redirect to Gmail connection page
    setIsOpen(false);
    window.location.href = '/dashboard/gmail-import';
  };

  const handleGmailConnectSuccess = () => {
    // Refresh status after successful connection
    if (onRefresh) {
      onRefresh();
    }

    // Refresh hybrid emails if available
    if (hybridEmails?.refresh) {
      hybridEmails.refresh();
    }
    
    // Re-check status
    setTimeout(() => {
      if (authUser?.id) {
        getConnectedAccounts(authUser.id).then(accounts => {
          const gmailAccount = accounts.find(acc => acc.provider === 'gmail');
          if (gmailAccount) {
            setGmailStatus({
              isConnected: true,
              email: gmailAccount.email,
              tokenExpiresAt: gmailAccount.token_expires_at,
              lastSyncAt: gmailAccount.last_sync_at,
              lastSyncStatus: 'connected',
              lastSyncError: null,
              needsReconnection: false
            });
          }
        });
      }
    }, 2000);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'hace un momento';
    if (diffInMinutes < 60) return `hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  };

  const formatMilliseconds = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return 'menos de 1m';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'database':
        return <Database className="h-3 w-3" />;
      case 'api':
        return <Globe className="h-3 w-3" />;
      default:
        return <Database className="h-3 w-3" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'database':
        return 'bg-green-500';
      case 'api':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'syncing':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'idle':
        return <Clock className="h-3 w-3" />;
      case 'connected':
        return <Wifi className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Estado de Conexión Gmail
          </DialogTitle>
          <DialogDescription>
            Gestiona tu conexión con Gmail y diagnostica problemas de tokens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Estado de Conexión
                </CardTitle>
                <div className="flex items-center gap-2">
                  {gmailStatus.isConnected ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Desconectado
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {gmailStatus.needsReconnection && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Tu conexión con Gmail necesita ser renovada. 
                      {gmailStatus.lastSyncError && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          Error: {gmailStatus.lastSyncError}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cuenta:</span>
                    <p className="font-medium">{gmailStatus.email || 'No conectada'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Token expira:</span>
                    <p className="font-medium">
                      {gmailStatus.tokenExpiresAt 
                        ? formatTimeAgo(gmailStatus.tokenExpiresAt)
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Último sync:</span>
                    <p className="font-medium">
                      {gmailStatus.lastSyncAt 
                        ? formatTimeAgo(gmailStatus.lastSyncAt)
                        : 'Nunca'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado sync:</span>
                    <p className="font-medium capitalize">
                      {gmailStatus.lastSyncStatus || 'Desconocido'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {gmailStatus.needsReconnection ? (
                    <div className="flex gap-2 w-full">
                      <Button 
                        onClick={handleConnectGmail}
                        size="sm"
                        className="flex-1"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Reconectar Gmail
                      </Button>
                      <GmailConnectDialog onSuccess={handleGmailConnectSuccess}>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Conectar Nueva Cuenta
                        </Button>
                      </GmailConnectDialog>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <Button 
                        onClick={handleTokenRefresh}
                        disabled={isRefreshingToken}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        {isRefreshingToken ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Renovar Token
                      </Button>
                      
                      <Button 
                        onClick={handleTestAutoRefresh}
                        disabled={isTestingAutoRefresh}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        {isTestingAutoRefresh ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Test Auto-refresh
                      </Button>
                    </div>
                  )}
                </div>

                {/* Toggle Diagnostics */}
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="w-full"
                  >
                    {showDiagnostics ? 'Ocultar Diagnóstico Técnico' : 'Mostrar Diagnóstico Técnico'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Activities Section */}
          {contactEmail && hybridEmails && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Actividades de Email
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${getSourceColor(hybridEmails.source)} text-white border-transparent`}
                    >
                      {getSourceIcon(hybridEmails.source)}
                      <span className="ml-1 capitalize">{hybridEmails.source}</span>
                    </Badge>
                    
                    <Badge variant="outline" className="bg-gray-50">
                      {getSyncStatusIcon(hybridEmails.syncStatus)}
                      <span className="ml-1 capitalize">{hybridEmails.syncStatus}</span>
                    </Badge>
                  </div>
                </div>
                
                {hybridEmails.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Último sync: {formatTimeAgo(hybridEmails.lastSyncAt)}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Total: {hybridEmails.emails?.length || 0}</span>
                    <span>Fuente: {hybridEmails.source}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={hybridEmails.triggerSync}
                      disabled={hybridEmails.loading || hybridEmails.syncStatus === 'syncing'}
                      size="sm"
                      variant="outline"
                    >
                      {hybridEmails.syncStatus === 'syncing' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sincronizar
                    </Button>
                    
                    <Button 
                      onClick={hybridEmails.refresh}
                      disabled={hybridEmails.loading}
                      size="sm"
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualizar
                    </Button>
                  </div>

                  <Separator />

                  {/* Error Display */}
                  {hybridEmails.error && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>Error al cargar emails: {hybridEmails.error}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={hybridEmails.refresh}
                          disabled={hybridEmails.loading}
                        >
                          <RefreshCw className={`w-4 h-4 ${hybridEmails.loading ? 'animate-spin' : ''}`} />
                          Reintentar
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Gmail Connection Prompt */}
                  {hybridEmails.source === 'database' && hybridEmails.emails?.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <span>Conecta Gmail para ver actividades de email en el timeline</span>
                          <GmailConnectDialog onSuccess={handleGmailConnectSuccess}>
                            <Button size="sm" className="ml-2">
                              <Plus className="w-4 h-4 mr-1" />
                              Conectar Gmail
                            </Button>
                          </GmailConnectDialog>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Diagnostics */}
          {showDiagnostics && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Información Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {diagnostics ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Token presente:</span>
                      <p className={`font-medium ${diagnostics.hasToken ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnostics.hasToken ? 'Sí' : 'No'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Token expirado:</span>
                      <p className={`font-medium ${diagnostics.tokenExpired ? 'text-red-600' : 'text-green-600'}`}>
                        {diagnostics.tokenExpired ? 'Sí' : 'No'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tiempo restante:</span>
                      <p className="font-medium">
                        {diagnostics.timeUntilExpiry 
                          ? formatMilliseconds(diagnostics.timeUntilExpiry)
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Intentos fallidos:</span>
                      <p className={`font-medium ${diagnostics.failedAttempts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {diagnostics.failedAttempts}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Refresh token:</span>
                      <p className={`font-medium ${diagnostics.refreshTokenPresent ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnostics.refreshTokenPresent ? 'Presente' : 'Ausente'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cuenta habilitada:</span>
                      <p className={`font-medium ${diagnostics.accountEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnostics.accountEnabled ? 'Sí' : 'No'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Cargando diagnóstico...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                ¿Necesitas ayuda?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• <strong>Token expirado:</strong> Usa "Renovar Token" para obtener un nuevo token automáticamente</p>
                <p>• <strong>Auto-refresh falla:</strong> Usa "Test Auto-refresh" para verificar si el sistema funciona</p>
                <p>• <strong>Problemas persistentes:</strong> Usa "Reconectar Gmail" para reautorizar la aplicación</p>
                <p>• <strong>Diagnóstico técnico:</strong> Muestra información detallada para depuración avanzada</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 