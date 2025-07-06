import { supabase } from "../../integrations/supabase/client";
import {
  TokenData,
  DatabaseTokenRecord,
  DatabaseEmailAccount,
  GmailAccount,
} from "@/types/google";

/**
 * Token Service for Gmail OAuth2 integration
 * Handles secure storage and retrieval of OAuth tokens in Supabase
 */

// Track failed refresh attempts to prevent infinite loops
const failedRefreshAttempts = new Map<string, number>();
const MAX_REFRESH_ATTEMPTS = 1;

/**
 * Saves OAuth tokens to Supabase database
 * @param userId - The authenticated user's ID
 * @param email - The Gmail account email
 * @param tokens - Token data to save
 * @returns Promise<void>
 */
export async function saveTokens(
  userId: string,
  email: string,
  tokens: TokenData
): Promise<void> {
  try {
    // First, create or update the email account record
    const { data: emailAccount, error: emailAccountError } = await supabase
      .from("email_accounts")
      .upsert(
        {
          user_id: userId,
          email: email,
          provider: "gmail",
          sync_enabled: true,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,email",
        }
      )
      .select()
      .single();

    if (emailAccountError) {
      throw new Error(
        `Failed to save email account: ${emailAccountError.message}`
      );
    }

    // Then save the tokens
    const { error: tokenError } = await supabase.from("oauth_tokens").upsert(
      {
        user_id: userId,
        email_account_id: emailAccount.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at.toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,email_account_id",
      }
    );

    if (tokenError) {
      throw new Error(`Failed to save tokens: ${tokenError.message}`);
    }

    // Clear any failed refresh attempts for this account
    const key = `${userId}-${email}`;
    failedRefreshAttempts.delete(key);
  } catch (error) {
    console.error("Error saving tokens:", error);
    throw error;
  }
}

/**
 * Retrieves a valid access token for the user
 * @param userId - The authenticated user's ID
 * @param email - Optional specific email account
 * @returns Promise<string | null> - Valid access token or null
 */
export async function getValidToken(
  userId: string,
  email?: string
): Promise<string | null> {
  try {
    let query = supabase
      .from("oauth_tokens")
      .select(
        `
        *,
        email_accounts!inner(email, sync_enabled)
      `
      )
      .eq("user_id", userId)
      .eq("email_accounts.sync_enabled", true);

    if (email) {
      query = query.eq("email_accounts.email", email);
    }

    const { data: tokens, error } = await query.single();

    if (error || !tokens) {
      return null;
    }

    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();

    // If token is still valid (with 5 minute buffer)
    if (expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
      return tokens.access_token;
    }

    // Check if we've already tried to refresh this token recently
    const key = `${userId}-${email || "default"}`;
    const attempts = failedRefreshAttempts.get(key) || 0;

    if (attempts >= MAX_REFRESH_ATTEMPTS) {
      console.warn(
        `Max refresh attempts reached for ${
          email || "user"
        }. User needs to reconnect.`
      );
      return null;
    }

    // Try to refresh the token
    const refreshedToken = await refreshTokenIfNeeded(userId, email);
    return refreshedToken;
  } catch (error) {
    console.error("Error getting valid token:", error);
    return null;
  }
}

/**
 * Refreshes an access token if needed
 * @param userId - The authenticated user's ID
 * @param email - Optional specific email account
 * @returns Promise<string | null> - New access token or null
 */
export async function refreshTokenIfNeeded(
  userId: string,
  email?: string
): Promise<string | null> {
  const key = `${userId}-${email || "default"}`;

  try {
    let query = supabase
      .from("oauth_tokens")
      .select(
        `
        *,
        email_accounts!inner(email, sync_enabled)
      `
      )
      .eq("user_id", userId)
      .eq("email_accounts.sync_enabled", true);

    if (email) {
      query = query.eq("email_accounts.email", email);
    }

    const { data: tokenRecord, error } = await query.single();

    if (error || !tokenRecord || !tokenRecord.refresh_token) {
      return null;
    }

    // Check if token needs refresh (expires in less than 5 minutes)
    const expiresAt = new Date(tokenRecord.expires_at);
    const now = new Date();

    if (expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
      return tokenRecord.access_token; // Still valid
    }

    // Refresh the token
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        refresh_token: tokenRecord.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!refreshResponse.ok) {
      // Track failed attempts
      failedRefreshAttempts.set(key, (failedRefreshAttempts.get(key) || 0) + 1);

      // If it's a 400 error, the refresh token is likely invalid
      if (refreshResponse.status === 400) {
        console.error(
          "Refresh token is invalid. User needs to reconnect their Gmail account."
        );
        // Mark the account as needing reconnection
        await supabase
          .from("email_accounts")
          .update({
            last_sync_status: "failed",
            last_sync_error:
              "Invalid refresh token. Please reconnect your Gmail account.",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("email", email || "");
      }

      throw new Error(`Token refresh failed: ${refreshResponse.statusText}`);
    }

    const refreshData = await refreshResponse.json();

    // Update the token in database
    const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

    const { error: updateError } = await supabase
      .from("oauth_tokens")
      .update({
        access_token: refreshData.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenRecord.id);

    if (updateError) {
      throw new Error(
        `Failed to update refreshed token: ${updateError.message}`
      );
    }

    // Clear failed attempts on successful refresh
    failedRefreshAttempts.delete(key);

    return refreshData.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

/**
 * Deletes all tokens for a user's Gmail account
 * @param userId - The authenticated user's ID
 * @param email - Optional specific email account
 * @returns Promise<void>
 */
export async function deleteTokens(
  userId: string,
  email?: string
): Promise<void> {
  try {
    if (email) {
      // First get the email account ID
      const { data: emailAccount } = await supabase
        .from("email_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("email", email)
        .single();

      if (emailAccount) {
        // Delete tokens
        const { error: tokenError } = await supabase
          .from("oauth_tokens")
          .delete()
          .eq("user_id", userId)
          .eq("email_account_id", emailAccount.id);

        if (tokenError) {
          throw new Error(`Failed to delete tokens: ${tokenError.message}`);
        }

        // Delete the email account
        const { error: accountError } = await supabase
          .from("email_accounts")
          .delete()
          .eq("user_id", userId)
          .eq("email", email);

        if (accountError) {
          throw new Error(
            `Failed to delete email account: ${accountError.message}`
          );
        }
      }
    } else {
      // Delete all tokens for the user
      const { error: tokenError } = await supabase
        .from("oauth_tokens")
        .delete()
        .eq("user_id", userId);

      if (tokenError) {
        throw new Error(`Failed to delete tokens: ${tokenError.message}`);
      }

      // Delete all email accounts for the user
      const { error: accountError } = await supabase
        .from("email_accounts")
        .delete()
        .eq("user_id", userId)
        .eq("provider", "gmail");

      if (accountError) {
        throw new Error(
          `Failed to delete email accounts: ${accountError.message}`
        );
      }
    }
  } catch (error) {
    console.error("Error deleting tokens:", error);
    throw error;
  }
}

/**
 * Gets all connected Gmail accounts for a user
 * @param userId - The authenticated user's ID
 * @returns Promise<GmailAccount[]>
 */
export async function getConnectedAccounts(
  userId: string
): Promise<GmailAccount[]> {
  try {
    const { data: accounts, error } = await supabase
      .from("email_accounts")
      .select(
        `
        *,
        oauth_tokens(expires_at)
      `
      )
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get connected accounts: ${error.message}`);
    }

    return accounts.map((account: any) => ({
      id: account.id,
      user_id: account.user_id,
      email: account.email,
      provider: "gmail" as const,
      sync_enabled: account.sync_enabled,
      last_sync_at: account.last_sync_at
        ? new Date(account.last_sync_at)
        : undefined,
      created_at: new Date(account.created_at),
      updated_at: new Date(account.updated_at),
      is_connected: account.sync_enabled && account.oauth_tokens.length > 0,
      token_expires_at: account.oauth_tokens[0]?.expires_at
        ? new Date(account.oauth_tokens[0].expires_at)
        : undefined,
    }));
  } catch (error) {
    console.error("Error getting connected accounts:", error);
    return [];
  }
}

/**
 * Checks if a user has any connected Gmail accounts
 * @param userId - The authenticated user's ID
 * @returns Promise<boolean>
 */
export async function hasConnectedAccounts(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("email_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .eq("sync_enabled", true)
      .limit(1);

    if (error) {
      console.error("Error checking connected accounts:", error);
      return false;
    }

    return data.length > 0;
  } catch (error) {
    console.error("Error checking connected accounts:", error);
    return false;
  }
}

/**
 * Updates the last sync time for an email account
 * @param userId - The authenticated user's ID
 * @param email - The email account
 * @returns Promise<void>
 */
export async function updateLastSyncTime(
  userId: string,
  email: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("email_accounts")
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("email", email);

    if (error) {
      throw new Error(`Failed to update last sync time: ${error.message}`);
    }
  } catch (error) {
    console.error("Error updating last sync time:", error);
    throw error;
  }
}

/**
 * Enables or disables sync for an email account
 * @param userId - The authenticated user's ID
 * @param email - The email account
 * @param enabled - Whether to enable or disable sync
 * @returns Promise<void>
 */
export async function setSyncEnabled(
  userId: string,
  email: string,
  enabled: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from("email_accounts")
      .update({
        sync_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("email", email);

    if (error) {
      throw new Error(`Failed to update sync status: ${error.message}`);
    }
  } catch (error) {
    console.error("Error updating sync status:", error);
    throw error;
  }
}
