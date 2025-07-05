import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Mail, Trash2, RefreshCw, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth";
import { useStore } from "@/stores";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GmailAccount {
  id: string;
  email: string;
  user_info?: {
    name?: string;
    picture?: string;
  };
  sync_enabled: boolean;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_error?: string;
  created_at: string;
}

interface GmailAccountsListProps {
  onAccountDisconnected?: (email: string) => void;
}

export function GmailAccountsList({ onAccountDisconnected }: GmailAccountsListProps) {
  const { user } = useAuth();
  const { 
    connectedAccounts: accounts, 
    isLoading: loading, 
    loadAccounts,
    disconnectAccount
  } = useStore();
  const [accountsState, setAccountsState] = useState<GmailAccount[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadAccounts(user.id);
    }
  }, [user, loadAccounts]);

  const handleDisconnect = async (email: string) => {
    if (!user) return;

    try {
      await disconnectAccount(user.id, email);
      onAccountDisconnected?.(email);
    } catch (error) {
      console.error('Error disconnecting Gmail account:', error);
    }
  };

  const getSyncStatusBadge = (account: GmailAccount) => {
    if (!account.sync_enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }

    switch (account.last_sync_status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'started':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getLastSyncText = (account: GmailAccount) => {
    if (!account.last_sync_at) return 'Never synced';
    
    try {
      return `Last sync: ${format(new Date(account.last_sync_at), 'MMM d, yyyy h:mm a')}`;
    } catch {
      return 'Last sync: Invalid date';
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user authenticated");
        return;
      }

      // Check email_accounts table
      const { data: emailAccounts, error: emailError } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("user_id", user.id);

      console.log("Email Accounts:", emailAccounts, emailError);

      // Check oauth_tokens table
      const { data: oauthTokens, error: tokenError } = await supabase
        .from("oauth_tokens")
        .select("*")
        .eq("user_id", user.id);

      console.log("OAuth Tokens:", oauthTokens, tokenError);

      toast({
        title: "Connection Status",
        description: `Found ${emailAccounts?.length || 0} email accounts and ${oauthTokens?.length || 0} tokens. Check console for details.`,
      });
    } catch (error) {
      console.error("Error checking connection status:", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connected Gmail Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connected Gmail Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Mail className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-muted-foreground">
              No Gmail accounts connected yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Connected Gmail Accounts ({accounts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Connected Gmail Accounts</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={checkConnectionStatus}
            >
              Check Status
            </Button>
          </div>
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={account.user_info?.picture} 
                    alt={account.user_info?.name || account.email}
                  />
                  <AvatarFallback>
                    {account.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {account.user_info?.name || account.email}
                    </p>
                    {getSyncStatusBadge(account)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {account.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getLastSyncText(account)}
                  </p>
                  {account.last_sync_error && (
                    <p className="text-xs text-red-500 mt-1">
                      Error: {account.last_sync_error}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={loading}
                      >
                        {loading ? (
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
        </div>
      </CardContent>
    </Card>
  );
} 