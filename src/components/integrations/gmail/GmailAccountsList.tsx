import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Trash2, RefreshCw, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth";
import { useGmail } from "@/hooks/gmail";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import GmailLogo from "@/components/svgs/integrations-images/gmail-logo.svg";

interface GmailAccountsListProps {
  onAccountDisconnected?: (email: string) => void;
}

export function GmailAccountsList({ onAccountDisconnected }: GmailAccountsListProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Use the new Gmail hook instead of legacy store
  const {
    accounts,
    loading,
    error,
    disconnectAccount,
    refreshAccounts,
    healthCheck
  } = useGmail({ 
    enableLogging: false,    // Disable to prevent console spam
    autoInitialize: false   // Disable to prevent conflicts
  });

  // Auto-expand when accounts are available
  useEffect(() => {
    if (accounts.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [accounts.length, isExpanded]);

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

  const getSyncStatusBadge = (account: any) => {
    if (!account.sync_enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }

    // Note: last_sync_status may not be available in new service layer yet
    // This is temporary until full sync implementation
    if (account.is_connected) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
    } else {
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getLastSyncText = (account: any) => {
    if (!account.last_sync_at) return 'Never synced';
    
    try {
      return `Last sync: ${format(new Date(account.last_sync_at), 'MMM d, yyyy h:mm a')}`;
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
        <Button variant="outline" size="sm" onClick={refreshAccounts}>
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
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={account.picture} 
                  alt={account.name || account.email}
                />
                <AvatarFallback className="bg-blue-500 text-white">
                  {account.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">
                    {account.name || account.email}
                  </p>
                  {getSyncStatusBadge(account)}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {account.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getLastSyncText(account)}
                </p>
                {/* Note: last_sync_error may not be available in current service layer */}
              </div>

              <div className="flex items-center gap-2">
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