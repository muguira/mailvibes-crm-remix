import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Trash2, RefreshCw, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth";
import { useNavigate } from "react-router-dom";
// FIXED: Use granular selectors instead of useGmail hook to avoid infinite loops
import { 
  useGmailAccounts, 
  useGmailMainLoading, 
  useGmailError, 
  useGmailDisconnectAccount, 
  useGmailRefreshAccounts,
  useGmailHealthCheck,
  useGmailInitializeService,
  useGmailLoadAccounts
} from "@/stores/gmail/selectors";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import GmailLogo from "@/components/svgs/integrations-images/gmail-logo.svg";


interface GmailAccountsListProps {
  onAccountDisconnected?: (email: string) => void;
}

export function GmailAccountsList({ onAccountDisconnected }: GmailAccountsListProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const { toast } = useToast();

  // FIXED: Use granular selectors instead of useGmail hook to avoid infinite loops
  const accounts = useGmailAccounts() || [];
  const loading = { accounts: useGmailMainLoading() }; // Convert to object for compatibility
  const error = useGmailError();
  const disconnectAccount = useGmailDisconnectAccount();
  const refreshAccounts = useGmailRefreshAccounts();
  const healthCheck = useGmailHealthCheck();
  const initializeService = useGmailInitializeService();
  const loadAccounts = useGmailLoadAccounts();

  // Auto-expand when accounts are available (only once)
  useEffect(() => {
    if (accounts.length > 0 && !hasAutoExpanded) {
      setIsExpanded(true);
      setHasAutoExpanded(true);
    }
  }, [accounts.length, hasAutoExpanded]);

  // Custom retry function that initializes service and loads accounts
  const handleRetry = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      // First initialize the service
      await initializeService(user.id);
      // Then load accounts
      await loadAccounts();
      
      toast({
        title: "Success",
        description: "Gmail service initialized successfully",
      });
    } catch (error) {
      console.error('Error initializing Gmail service:', error);
      toast({
        title: "Error", 
        description: `Failed to initialize Gmail service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (email: string) => {
    if (!user) return;

    try {
      await disconnectAccount(email);
      onAccountDisconnected?.(email);
      toast({
        title: "Account Disconnected",
        description: `Gmail account ${email} has been disconnected.`,
      });
    } catch (error) {
      console.error('Error disconnecting Gmail account:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAccountClick = (email: string) => {
    navigate('/settings/integrations/gmail-dashboard');
  };

  const getAccountInitials = (account: any) => {
    const email = account.email || '';
    const name = (account as any).name || (account as any).display_name || '';
    
    if (name) {
      // If we have a name, get initials from the name
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
      } else {
        return nameParts[0].charAt(0).toUpperCase();
      }
    } else {
      // If no name, get initials from email
      const emailPart = email.split('@')[0];
      if (emailPart.includes('.')) {
        const emailParts = emailPart.split('.');
        return (emailParts[0].charAt(0) + emailParts[1].charAt(0)).toUpperCase();
      } else {
        return emailPart.charAt(0).toUpperCase();
      }
    }
  };

  const getSyncStatusBadge = (account: any) => {
    if (!account.sync_enabled) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Paused</Badge>;
    }

    // Check for sync errors
    if (account.last_sync_error) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    }

    // Check if we have recent sync activity (within last hour) as Active
    if (account.last_sync_at) {
      const lastSyncTime = new Date(account.last_sync_at);
      const now = new Date();
      const timeDiffInMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
      
      // If synced within last hour and no errors, consider Active
      if (timeDiffInMinutes <= 60 && !account.last_sync_error) {
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      }
    }

    // Check last sync status
    if (account.last_sync_status === 'completed' && account.is_connected) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    } else if (account.last_sync_status === 'in_progress' || account.last_sync_status === 'started') {
      return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>;
    } else if (account.is_connected) {
      return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
    } else {
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getLastSyncText = (account: any) => {
    if (!account.last_sync_at) return 'Never synced';
    
    try {
      const lastSyncDate = new Date(account.last_sync_at);
      const timeAgo = formatDistanceToNow(lastSyncDate, { addSuffix: true });
      
      // Show error message if there was a sync error
      if (account.last_sync_error) {
        return `Sync failed ${timeAgo}: ${account.last_sync_error.slice(0, 50)}${account.last_sync_error.length > 50 ? '...' : ''}`;
      }
      
      // Show last successful sync
      return `Last sync: ${timeAgo}`;
    } catch {
      return 'Last sync: Invalid date';
    }
  };

  const handleHealthCheck = async () => {
    try {
      const isHealthy = await healthCheck();
      toast({
        title: "Health Check",
        description: isHealthy 
          ? "Gmail service is healthy and ready"
          : "Gmail service issues detected. Check console for details.",
        variant: isHealthy ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error during health check:", error);
      toast({
        title: "Health Check Failed",
        description: "Unable to perform health check. Check console for details.",
        variant: "destructive",
      });
    }
  };

  if (loading.accounts) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
              <div className="w-24 h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-3" />
        <p className="text-sm text-red-600 mb-2">
          Error loading Gmail accounts
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {error}
        </p>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-6">
        <Mail className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-muted-foreground">
          No Gmail accounts connected yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 h-auto hover:bg-transparent"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <img src={GmailLogo} alt="Gmail" className="h-5 w-5" />
          <h3 className="text-lg font-medium">Gmail Accounts ({accounts.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAccounts}
            disabled={loading.accounts}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading.accounts ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleHealthCheck}
          >
            Health Check
          </Button>

        </div>
      </div>
      
      {isExpanded && (
        <div className="space-y-3 ml-6">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3 p-3 border rounded-lg">
              {/* Clickeable area for navigation */}
              <div 
                className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -m-1"
                onClick={() => handleAccountClick(account.email)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={(account as any).picture || (account as any).avatar_url || (account as any).photo} 
                    alt={(account as any).name || (account as any).display_name || account.email}
                  />
                  <AvatarFallback className="bg-blue-500 text-white font-medium">
                    {getAccountInitials(account)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {(account as any).name || (account as any).display_name || account.email.split('@')[0]}
                    </p>
                    {getSyncStatusBadge(account)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {account.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getLastSyncText(account)}
                  </p>
                </div>
              </div>

              {/* Delete button - separate from clickeable area */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={loading.accounts}
                    >
                      {loading.accounts ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Gmail Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to disconnect <strong>{account.email}</strong>? 
                        This will stop syncing emails and remove access to this account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDisconnect(account.email)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 