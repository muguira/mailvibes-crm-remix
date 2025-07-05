import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Mail, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth";
import { useStore } from "@/stores";
import { isOAuthCallback } from "@/services/google/authService";

interface GmailConnectDialogProps {
  children: React.ReactNode;
  onSuccess?: (email: string) => void;
}

export function GmailConnectDialog({ children, onSuccess }: GmailConnectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { 
    isConnecting, 
    authError: error, 
    connectAccount,
    handleOAuthCallback,
    connectedAccounts
  } = useStore();

  // Handle OAuth callback if we're returning from Google
  useEffect(() => {
    console.log("[GmailConnectDialog] Checking for OAuth callback...");
    console.log("[GmailConnectDialog] Current URL:", window.location.href);
    console.log("[GmailConnectDialog] Is OAuth callback?", isOAuthCallback());
    console.log("[GmailConnectDialog] User:", user);
    
    if (isOAuthCallback() && user) {
      console.log("[GmailConnectDialog] OAuth callback detected!");
      
      // Check if we already handled this specific callback
      const currentUrl = window.location.href;
      const handledUrl = sessionStorage.getItem('gmail_oauth_callback_url');
      
      if (handledUrl !== currentUrl) {
        console.log("[GmailConnectDialog] Handling OAuth callback...");
        sessionStorage.setItem('gmail_oauth_callback_url', currentUrl);
        
        handleOAuthCallback(user.id).finally(() => {
          // Clean up after handling
          setTimeout(() => {
            sessionStorage.removeItem('gmail_oauth_callback_url');
            // Also clean the URL parameters
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
        console.log("[GmailConnectDialog] OAuth callback already handled for this URL");
      }
    }
  }, [user, handleOAuthCallback]);

  // Watch for new accounts and trigger success callback
  useEffect(() => {
    if (connectedAccounts.length > 0) {
      const latestAccount = connectedAccounts[0];
      onSuccess?.(latestAccount.email);
      setIsOpen(false);
    }
  }, [connectedAccounts, onSuccess]);

  const handleConnect = async () => {
    if (!user) return;
    await connectAccount(user.id);
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