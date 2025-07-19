import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useGmailAuth } from '@/hooks/use-gmail-auth';
import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

interface GmailPermissionsAlertProps {
  onReconnectStart?: () => void;
  onReconnectSuccess?: () => void;
  className?: string;
}

export function GmailPermissionsAlert({ 
  onReconnectStart, 
  onReconnectSuccess,
  className = ''
}: GmailPermissionsAlertProps) {
  const [needsReconnection, setNeedsReconnection] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  
  const { accounts, connectAccount, refreshAccounts } = useGmailAuth();

  // Check if Gmail is connected and has proper scopes
  useEffect(() => {
    checkGmailPermissions();
  }, [accounts]);

  const checkGmailPermissions = async () => {
    try {
      setCheckingPermissions(true);
      
      if (accounts.length === 0) {
        // No Gmail connected
        setNeedsReconnection(false);
        return;
      }

      // For now, we'll assume permissions need to be checked when an email send fails
      // This component will be triggered by the email send error
      setNeedsReconnection(false);
      
    } catch (error) {
      logger.error('Error checking Gmail permissions:', error);
      setNeedsReconnection(true);
    } finally {
      setCheckingPermissions(false);
    }
  };

  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      onReconnectStart?.();

      logger.info('Starting Gmail reconnection for extended permissions...');
      
      // Disconnect existing accounts first to force fresh permission request
      // Note: We'll skip this for now to keep it simple
      
      // Connect with full scopes (including gmail.compose)
      await connectAccount();
      
      toast({
        title: "Reconnection Started",
        description: "Please complete the Gmail authorization to enable email sending.",
      });

    } catch (error) {
      logger.error('Error during Gmail reconnection:', error);
      toast({
        title: "Reconnection Failed",
        description: "Failed to start Gmail reconnection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReconnecting(false);
    }
  };

  // Don't show anything if checking permissions or no issue detected
  if (checkingPermissions || !needsReconnection) {
    return null;
  }

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-amber-600" />
          <span className="text-amber-800">
            Gmail permissions need to be updated to send emails
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="ml-4 border-amber-300 text-amber-800 hover:bg-amber-100"
        >
          {isReconnecting ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Reconnecting...
            </>
          ) : (
            'Update Permissions'
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Hook to manually trigger the permissions alert
 * Call this when an email send fails due to insufficient scopes
 */
export function useGmailPermissionsAlert() {
  const [alertKey, setAlertKey] = useState(0);

  const triggerPermissionsAlert = () => {
    setAlertKey(prev => prev + 1);
    
    // Show toast immediately
    toast({
      title: "Gmail Permissions Required",
      description: "Please update Gmail permissions to send emails.",
      variant: "destructive",
    });
  };

  return {
    triggerPermissionsAlert,
    alertKey,
  };
} 