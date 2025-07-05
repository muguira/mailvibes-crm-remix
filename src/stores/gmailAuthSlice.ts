import { StateCreator } from "zustand";
import { TGmailAuthStore } from "@/types/store/gmail";
import { TStore } from "@/types/store/store";
import {
  INITIAL_GMAIL_AUTH_STATE,
  RESET_GMAIL_AUTH_STATE,
} from "@/constants/store/gmail";
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
import { logger } from "@/utils/logger";

/**
 * Gmail Authentication slice for Zustand store
 *
 * Manages the complete Gmail OAuth2 lifecycle including:
 * - OAuth2 flow with PKCE for secure authentication
 * - Multiple Gmail account connections
 * - Token management and refresh
 * - Account disconnection and cleanup
 * - Error handling and retry logic
 * - Real-time sync status tracking
 *
 * @example
 * ```typescript
 * // Usage in component
 * const { connectedAccounts, connectAccount, disconnectAccount } = useStore();
 *
 * // Connect a new Gmail account
 * await connectAccount(user.id);
 *
 * // Disconnect an account
 * await disconnectAccount(user.id, 'user@gmail.com');
 * ```
 */
export const useGmailAuthSlice: StateCreator<
  TStore,
  [["zustand/subscribeWithSelector", never], ["zustand/immer", never]],
  [],
  TGmailAuthStore
> = (set, get) => ({
  // Initial state from constants
  ...INITIAL_GMAIL_AUTH_STATE,

  /**
   * Initialize the Gmail auth state by loading accounts for the current user
   * @param userId - The ID of the current user
   * @returns Promise that resolves when initialization is complete
   */
  initializeGmailAuth: async (userId: string) => {
    if (!userId) {
      logger.error("Cannot initialize Gmail auth: No user ID provided");
      return;
    }

    set((state) => {
      state.isLoading = true;
      state.authError = null;
    });

    try {
      await get().loadAccounts(userId);

      // Handle OAuth callback if we're returning from Google
      if (isOAuthCallback()) {
        await get().handleOAuthCallback(userId);
      }

      set((state) => {
        state.isInitialized = true;
        state.lastSync = new Date();
      });
    } catch (error) {
      logger.error("Error initializing Gmail auth:", error);
      set((state) => {
        state.authError =
          error instanceof Error
            ? error.message
            : "Failed to initialize Gmail auth";
      });
    } finally {
      set((state) => {
        state.isLoading = false;
      });
    }
  },

  /**
   * Reset the Gmail auth state to its initial values
   * Clears all accounts, errors, and loading states
   */
  reset: () => {
    set((state) => {
      Object.assign(state, RESET_GMAIL_AUTH_STATE);
    });
  },

  /**
   * Connect a new Gmail account using OAuth2 flow
   * @param userId - The ID of the current user
   */
  connectAccount: async (userId: string) => {
    if (!userId) {
      toast.error("Please sign in to connect your Gmail account");
      return;
    }

    try {
      set((state) => {
        state.isConnecting = true;
        state.authError = null;
      });

      const authUrl = await initiateOAuthFlow(getRedirectUri());

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      logger.error("OAuth initiation error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initiate Gmail connection";

      set((state) => {
        state.authError = errorMessage;
        state.isConnecting = false;
      });

      toast.error("Failed to connect Gmail account");
    }
  },

  /**
   * Disconnect a Gmail account and revoke tokens
   * @param userId - The ID of the current user
   * @param email - The email address of the account to disconnect
   */
  disconnectAccount: async (userId: string, email: string) => {
    if (!userId) return;

    try {
      await disconnectGmailAccount(userId, email);

      // Remove from local state
      set((state) => {
        state.connectedAccounts = state.connectedAccounts.filter(
          (acc) => acc.email !== email
        );
      });

      toast.success(`Gmail account ${email} disconnected successfully`);
    } catch (error) {
      logger.error("Error disconnecting Gmail account:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to disconnect Gmail account";

      set((state) => {
        state.authError = errorMessage;
      });

      toast.error("Failed to disconnect Gmail account");
    }
  },

  /**
   * Refresh the connection by reloading accounts
   * @param userId - The ID of the current user
   */
  refreshConnection: async (userId: string) => {
    await get().loadAccounts(userId);
  },

  /**
   * Set an authentication error
   * @param error - The error message to set, or null to clear
   */
  setAuthError: (error: string | null) => {
    set((state) => {
      state.authError = error;
    });
  },

  /**
   * Load Gmail accounts from the database
   * @param userId - The ID of the current user
   */
  loadAccounts: async (userId: string) => {
    if (!userId) return;

    try {
      set((state) => {
        state.isLoading = true;
        state.authError = null;
      });

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
          settings
        `
        )
        .eq("user_id", userId)
        .eq("provider", "gmail");

      if (error) throw error;

      console.log("[GmailAuthSlice] Raw accounts data from DB:", data);

      const formattedAccounts =
        data?.map((account) => {
          console.log("[GmailAuthSlice] Processing account:", account);
          console.log("[GmailAuthSlice] Account settings:", account.settings);

          const formatted = {
            ...account,
            user_info:
              typeof account.settings === "object" && account.settings !== null
                ? (account.settings as { name?: string; picture?: string })
                : {},
          };

          console.log("[GmailAuthSlice] Formatted account:", formatted);
          return formatted;
        }) || [];

      set((state) => {
        state.connectedAccounts = formattedAccounts;
        state.lastSync = new Date();
      });
    } catch (error) {
      logger.error("Error loading Gmail accounts:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load Gmail accounts";

      set((state) => {
        state.authError = errorMessage;
      });
    } finally {
      set((state) => {
        state.isLoading = false;
      });
    }
  },

  /**
   * Handle OAuth callback from Google
   * @param userId - The ID of the current user
   */
  handleOAuthCallback: async (userId: string) => {
    if (!userId) return;

    try {
      set((state) => {
        state.isConnecting = true;
        state.authError = null;
      });

      const params = extractCallbackParams();
      console.log("[GmailAuthSlice] OAuth callback params:", params);

      if (params.error) {
        throw new Error(params.error_description || params.error);
      }

      if (!params.code || !params.state) {
        console.error("[GmailAuthSlice] Missing params:", {
          code: params.code,
          state: params.state,
        });
        throw new Error("Missing authorization code or state parameter");
      }

      console.log("[GmailAuthSlice] Calling handleOAuthCallback service...");
      const tokenData = await handleOAuthCallback(
        params.code,
        params.state,
        getRedirectUri(),
        userId
      );
      console.log("[GmailAuthSlice] Token data received:", tokenData);

      // Clean up URL
      cleanupCallbackUrl();

      toast.success(`Gmail account connected successfully: ${tokenData.email}`);

      // Refresh accounts list
      await get().loadAccounts(userId);
    } catch (error) {
      logger.error("OAuth callback error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to connect Gmail account";

      set((state) => {
        state.authError = errorMessage;
      });

      toast.error("Failed to connect Gmail account");
    } finally {
      set((state) => {
        state.isConnecting = false;
      });
    }
  },

  /**
   * Get a valid access token for a specific email account
   * @param userId - The ID of the current user
   * @param email - The email address of the account
   * @returns Promise that resolves to the access token or null
   */
  getAccessToken: async (
    userId: string,
    email: string
  ): Promise<string | null> => {
    if (!userId) return null;

    try {
      return await getValidToken(userId, email);
    } catch (error) {
      logger.error("Error getting access token:", error);
      return null;
    }
  },

  /**
   * Clear all Gmail auth state
   */
  clearState: () => {
    set((state) => {
      Object.assign(state, RESET_GMAIL_AUTH_STATE);
    });
  },
});
