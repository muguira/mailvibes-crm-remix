import React, { useState, forwardRef } from 'react';
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
  RefreshCw,
  Settings,
  WifiOff,
  Plus,
  Mail,
  Clock,
  Database,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { GmailConnectDialog } from '@/components/integrations/gmail/GmailConnectDialog';
import { useContactEmails } from "@/hooks/use-contact-emails-v2";
import { useGmail } from "@/hooks/gmail";
import { format } from "date-fns";

interface GmailConnectionModalProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  contactEmail?: string;
}

export const GmailConnectionModal = forwardRef<HTMLDivElement, GmailConnectionModalProps>(({ children, onRefresh, contactEmail }, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  // STEP 3: Fully restored Gmail hooks with autoInitialize
  const {
    accounts,
    loading,
    error,
    hasConnectedAccounts,
    primaryAccount,
    refreshAccounts,
    refreshConnection,
    healthCheck
  } = useGmail({ 
    enableLogging: false,  // Keep logging minimal
    autoInitialize: true   // Enable auto-init for seamless experience
  });

  // Use modern emails hook if contactEmail is provided
  const {
    emails,
    loading: emailsLoading,
    error: emailsError,
    hasMore,
    syncStatus: emailSyncStatus,
    syncEmailHistory,
    refreshEmails
  } = useContactEmails({
    contactEmail,
    autoFetch: true,
  });

  const handleGmailConnectSuccess = () => {
    // Refresh accounts after successful connection
    refreshAccounts();
    
    // Refresh other data if needed
    if (onRefresh) {
      onRefresh();
    }

    // Refresh emails if contactEmail is available
    if (contactEmail && refreshEmails) {
      refreshEmails();
    }

    toast.success('Gmail account connected successfully!');
  };

  const handleRefreshConnection = async () => {
    if (primaryAccount) {
      try {
        await refreshConnection(primaryAccount.email);
        toast.success('Connection refreshed successfully');
      } catch (error) {
        console.error('Error refreshing connection:', error);
        toast.error('Failed to refresh connection');
      }
    }
  };

  const handleHealthCheck = async () => {
    try {
      const isHealthy = await healthCheck();
      toast.success(isHealthy 
        ? 'Gmail service is healthy and ready' 
        : 'Gmail service issues detected. Check console for details.'
      );
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Health check failed. Check console for details.');
    }
  };

  const getConnectionStatus = () => {
    if (loading.accounts) {
      return {
        badge: <Badge variant="outline"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Checking...</Badge>,
        description: "Checking Gmail connection status..."
      };
    }

    if (error) {
      return {
        badge: <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>,
        description: `Connection error: ${error}`
      };
    }

    if (!hasConnectedAccounts) {
      return {
        badge: <Badge variant="outline"><WifiOff className="h-3 w-3 mr-1" />Not Connected</Badge>,
        description: "No Gmail accounts connected"
      };
    }

    if (primaryAccount) {
      return {
        badge: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>,
        description: `Connected as ${primaryAccount.email}`
      };
    }

    return {
      badge: <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Unknown</Badge>,
      description: "Connection status unknown"
    };
  };

  const status = getConnectionStatus();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Connection Status
          </DialogTitle>
          <DialogDescription>
            Manage your Gmail connection and view email data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Connection Status
                </CardTitle>
                <div className="flex items-center gap-2">
                  {status.badge}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {status.description}
                </p>

                {primaryAccount && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <span className="font-mono">{primaryAccount.email}</span>
                    </div>
                    {primaryAccount.last_sync_at && (
                      <div className="flex justify-between">
                        <span>Last sync:</span>
                        <span className="font-mono">
                          {format(new Date(primaryAccount.last_sync_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    )}
                    {primaryAccount.token_expires_at && (
                      <div className="flex justify-between">
                        <span>Token expires:</span>
                        <span className="font-mono">
                          {format(new Date(primaryAccount.token_expires_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {!hasConnectedAccounts ? (
                    <GmailConnectDialog onSuccess={handleGmailConnectSuccess}>
                      <Button className="flex-1">
                        <Plus className="h-4 w-4 mr-2" />
                        Connect Gmail Account
                      </Button>
                    </GmailConnectDialog>
                  ) : (
                    <div className="flex gap-2 w-full">
                      <Button 
                        onClick={handleRefreshConnection}
                        size="sm"
                        variant="outline"
                        disabled={loading.connecting}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading.connecting ? 'animate-spin' : ''}`} />
                        Refresh Connection
                      </Button>
                      <Button 
                        onClick={handleHealthCheck}
                        size="sm"
                        variant="outline"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Health Check
                      </Button>
                      <GmailConnectDialog onSuccess={handleGmailConnectSuccess}>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Account
                        </Button>
                      </GmailConnectDialog>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Data Status */}
          {contactEmail && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Email Data for {contactEmail}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {emailsLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading email data...
                    </div>
                  )}

                  {emails && emails.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Found {emails.length} emails
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <Database className="h-3 w-3 mr-1" />
                          Database
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Data source: Local database
                      </div>
                    </div>
                  )}

                  {emailsError && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>Error loading emails: {emailsError}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={refreshEmails}
                          disabled={emailsLoading}
                        >
                          <RefreshCw className={`w-4 h-4 ${emailsLoading ? 'animate-spin' : ''}`} />
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Gmail Connection Prompt */}
                  {!hasConnectedAccounts && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <span>Connect Gmail to view email activities in the timeline</span>
                          <GmailConnectDialog onSuccess={handleGmailConnectSuccess}>
                            <Button size="sm" className="ml-2">
                              <Plus className="w-4 h-4 mr-1" />
                              Connect Gmail
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

          {/* Accounts Summary */}
          {accounts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Connected Accounts ({accounts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                      <div>
                        <div className="font-medium">{account.name || account.email}</div>
                        <div className="text-xs text-muted-foreground">{account.email}</div>
                      </div>
                      <Badge variant={account.is_connected ? "default" : "secondary"}>
                        {account.is_connected ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}); 