import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  initiateOAuthFlow,
  handleOAuthCallback,
  disconnectGmailAccount,
  getRedirectUri,
  isOAuthCallback,
  extractCallbackParams,
  cleanupCallbackUrl,
} from "@/services/google/authService";
import { getValidToken } from "@/services/google/tokenService";
import { toast } from "sonner";
import { useStore } from "@/stores";

export interface GmailAccount {
  id: string;
  email: string;
  sync_enabled: boolean;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_error?: string;
  created_at: string;
  user_info?: {
    name?: string;
    picture?: string;
  };
}

interface UseGmailAuthReturn {
  accounts: GmailAccount[];
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  connectAccount: () => Promise<void>;
  disconnectAccount: (email: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  getAccessToken: (email: string) => Promise<string | null>;
}

export function useGmailAuth(): UseGmailAuthReturn {
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const store = useStore();
  const hasHandledCallbackRef = useRef(false);
  const hasLoadedAccountsRef = useRef(false);

  useEffect(() => {
    if (user && !hasLoadedAccountsRef.current) {
      hasLoadedAccountsRef.current = true;
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    // Handle OAuth callback if we're returning from Google
    if (isOAuthCallback() && !hasHandledCallbackRef.current) {
      hasHandledCallbackRef.current = true;
      handleCallback();
    }
  }, []);

  const loadAccounts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("email_accounts")
        .select(
          `
          id,
          email,
          sync_enabled,
          last_sync_at,
          last_sync_status,
          last_sync_error,
          created_at,
          oauth_tokens (
            user_info
          )
        `
        )
        .eq("user_id", user.id)
        .eq("provider", "gmail");

      if (error) throw error;

      const formattedAccounts =
        data?.map((account) => ({
          ...account,
          user_info: {},
        })) || [];

      setAccounts(formattedAccounts);
    } catch (err) {
      console.error("Error loading Gmail accounts:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load Gmail accounts"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallback = useCallback(async () => {
    console.log("[useGmailAuth] Starting callback handling...");
    const params = extractCallbackParams();
    console.log("[useGmailAuth] Callback params:", params);

    if (!params.code || !params.state) {
      console.log("[useGmailAuth] Missing code or state");
      return;
    }

    if (params.error) {
      console.error("[useGmailAuth] OAuth error:", params.error);
      toast.error(
        params.error_description || "An error occurred during authentication"
      );
      cleanupCallbackUrl();
      return;
    }

    try {
      setIsConnecting(true);
      console.log("[useGmailAuth] Calling handleOAuthCallback...");

      if (!user) {
        throw new Error("User not authenticated");
      }

      const tokenData = await handleOAuthCallback(
        params.code,
        params.state,
        getRedirectUri(),
        user.id
      );

      console.log("[useGmailAuth] OAuth callback handled successfully");
      // Remove the duplicate toast - it's already shown in the store
      // toast.success(`Gmail account connected successfully: ${tokenData.email}`);

      cleanupCallbackUrl();

      // Refresh accounts list
      await loadAccounts();
    } catch (error: any) {
      console.error("[useGmailAuth] OAuth callback error:", error);
      // Only show error toast if the store hasn't already shown it
      if (!error.message?.includes("Failed to connect Gmail account")) {
        toast.error(error.message || "Failed to connect Gmail account");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [user]); // Only depend on user, not store

  const connectAccount = async () => {
    if (!user) {
      toast.error("Please sign in to connect your Gmail account");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const authUrl = await initiateOAuthFlow(getRedirectUri());

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error("OAuth initiation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initiate Gmail connection"
      );
      setIsConnecting(false);
    }
  };

  const disconnectAccount = async (email: string) => {
    if (!user) return;

    try {
      await disconnectGmailAccount(user.id, email);

      // Remove from local state
      setAccounts((prev) => prev.filter((acc) => acc.email !== email));

      // Toast is already shown in the store, don't duplicate
      // toast.success(`Gmail account ${email} disconnected successfully`);
    } catch (err) {
      console.error("Error disconnecting Gmail account:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to disconnect Gmail account"
      );
      // Toast is already shown in the store
      // toast.error("Failed to disconnect Gmail account");
    }
  };

  const refreshAccounts = async () => {
    hasLoadedAccountsRef.current = false;
    await loadAccounts();
  };

  const getAccessToken = async (email: string): Promise<string | null> => {
    if (!user) return null;

    try {
      return await getValidToken(user.id, email);
    } catch (err) {
      console.error("Error getting access token:", err);
      return null;
    }
  };

  return {
    accounts,
    isLoading,
    isConnecting,
    error,
    connectAccount,
    disconnectAccount,
    refreshAccounts,
    getAccessToken,
  };
}

// Hook for getting Gmail accounts only
export function useGmailAccounts() {
  const { accounts, isLoading, error, refreshAccounts } = useGmailAuth();

  return {
    accounts,
    isLoading,
    error,
    refreshAccounts,
  };
}

// Hook for Gmail connection status
export function useGmailConnection() {
  const { accounts, isLoading, connectAccount, disconnectAccount } =
    useGmailAuth();

  const isConnected = accounts.length > 0;
  const connectedEmails = accounts.map((acc) => acc.email);

  return {
    isConnected,
    connectedEmails,
    isLoading,
    connectAccount,
    disconnectAccount,
  };
}
