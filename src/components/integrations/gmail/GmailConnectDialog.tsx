import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth";
import { useGmail } from "@/hooks/gmail";
import { isOAuthCallback } from "@/services/google/authService";
import { logger } from "@/utils/logger";

interface GmailConnectDialogProps {
  children: React.ReactNode;
  onSuccess?: (email: string) => void;
}

// Global flag to ensure OAuth callback is only handled once
let globalOAuthHandling = false;

export function GmailConnectDialog({ children, onSuccess }: GmailConnectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  
  // Use the new Gmail hook with auto-initialization for reconnection
  const {
    accounts: connectedAccounts,
    loading,
    error,
    connectAccount,
    handleOAuthCallback,
    refreshAccounts
  } = useGmail({ 
    userId: user?.id,        // Pass user ID for auto-initialization
    enableLogging: true,     // Enable logging to debug connection issues
    autoInitialize: true     // Enable auto-init for service availability
  });

  const isConnecting = loading.connecting;

  const hasCheckedCallbackRef = useRef(false);
  const componentId = useRef(Math.random().toString(36).substring(7));
  const previousAccountsCountRef = useRef(connectedAccounts.length);

  // Handle OAuth callback if we're returning from Google - simplified logic
  useEffect(() => {
    if (hasCheckedCallbackRef.current || globalOAuthHandling || !user) return;
    
    if (isOAuthCallback()) {
      hasCheckedCallbackRef.current = true;
      globalOAuthHandling = true;
      
      logger.debug(`[GmailConnectDialog-${componentId.current}] Handling OAuth callback...`);
      
      // Check if we already handled this specific callback
      const currentUrl = window.location.href;
      const handledUrl = sessionStorage.getItem('gmail_oauth_callback_url');
      
      if (handledUrl !== currentUrl) {
        sessionStorage.setItem('gmail_oauth_callback_url', currentUrl);
        
        // Extract OAuth parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        if (code && state) {
          handleOAuthCallback(code, state).finally(() => {
            // Clean up after handling
            setTimeout(() => {
              sessionStorage.removeItem('gmail_oauth_callback_url');
              globalOAuthHandling = false;
              // Clean the URL parameters
              const url = new URL(window.location.href);
              url.searchParams.delete('code');
              url.searchParams.delete('state');
              url.searchParams.delete('scope');
              url.searchParams.delete('authuser');
              url.searchParams.delete('hd');
              url.searchParams.delete('prompt');
              window.history.replaceState({}, document.title, url.toString());
            }, 1000);
          });
        } else {
          globalOAuthHandling = false;
        }
      } else {
        globalOAuthHandling = false;
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (globalOAuthHandling && componentId.current) {
        globalOAuthHandling = false;
      }
    };
  }, [user, handleOAuthCallback]);

  // Watch for NEW accounts being added
  useEffect(() => {
    // Only trigger if dialog is open and we have more accounts than before
    if (isOpen && connectedAccounts.length > previousAccountsCountRef.current) {
      const latestAccount = connectedAccounts[0];
      logger.debug(`[GmailConnectDialog] New account connected: ${latestAccount.email}`);
      onSuccess?.(latestAccount.email);
      setIsOpen(false);
    }
    
    // Update the count for next comparison
    previousAccountsCountRef.current = connectedAccounts.length;
  }, [connectedAccounts, onSuccess, isOpen]);

  const handleConnect = async () => {
    if (!user) {
      logger.error('[GmailConnectDialog] No user available for connection');
      return;
    }

    try {
      logger.debug(`[GmailConnectDialog] Initiating connection for user: ${user.id}`);
      const result = await connectAccount();
      
      if (result.success && result.redirectUrl) {
        // Redirect to Google OAuth
        window.location.href = result.redirectUrl;
      } else {
        logger.error('[GmailConnectDialog] Connection failed:', result.error);
      }
    } catch (error) {
      logger.error('[GmailConnectDialog] Connection error:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connect Gmail Account
          </DialogTitle>
          <DialogDescription>
            Connect your Gmail account to import contacts and sync email history with your CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">By connecting your Gmail account, you'll be able to:</p>
              <ul className="space-y-1 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  Import contacts from Gmail
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  View email history in contact timelines
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  Sync new emails automatically
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Connect Gmail Account
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isConnecting}
              >
                Cancel
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3">
            <p>
              We use OAuth2 with PKCE for secure authentication. Your credentials are never stored on our servers.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 