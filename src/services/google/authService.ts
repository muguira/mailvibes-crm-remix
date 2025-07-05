import {
  TokenResponse,
  TokenData,
  AuthUrlParams,
  TokenExchangeParams,
  RefreshTokenParams,
  RevokeTokenParams,
  GoogleUserInfo,
  AuthFlowError,
  AuthErrorType,
} from "@/types/google";
import {
  GOOGLE_OAUTH_URLS,
  GOOGLE_OAUTH_SCOPES,
} from "@/constants/store/google";

import {
  generatePKCEParams,
  generateState,
  storePKCEParams,
  retrievePKCEParams,
  clearPKCEParams,
  validateState,
} from "./pkceService";
import { saveTokens, deleteTokens } from "./tokenService";
import { supabase } from "@/integrations/supabase/client";
import * as tokenService from "./tokenService";

/**
 * Gmail OAuth2 Authentication Service
 * Handles the complete OAuth2 flow with PKCE for Gmail integration
 */

/**
 * Builds the Google OAuth2 authorization URL
 * @param redirectUri - The redirect URI for the OAuth flow
 * @param scopes - Array of OAuth scopes (optional, defaults to Gmail scopes)
 * @returns Authorization URL string
 */
export async function buildAuthUrl(
  redirectUri: string,
  scopes: string[] = [...GOOGLE_OAUTH_SCOPES]
): Promise<string> {
  try {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("Google Client ID not configured");
    }

    // Generate PKCE parameters
    const pkceParams = await generatePKCEParams();
    const state = generateState();

    // Store PKCE parameters for later validation
    storePKCEParams(pkceParams, state);

    // Build authorization URL
    const authParams: AuthUrlParams = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      code_challenge: pkceParams.code_challenge,
      code_challenge_method: "S256",
      state: state,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    };

    const url = new URL(GOOGLE_OAUTH_URLS.AUTH);
    Object.entries(authParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  } catch (error) {
    console.error("Error building auth URL:", error);
    throw createAuthError(
      "invalid_request",
      "Failed to build authorization URL",
      error
    );
  }
}

/**
 * Exchanges authorization code for access tokens
 * @param code - Authorization code from OAuth callback
 * @param redirectUri - The redirect URI used in the authorization request
 * @returns Promise<TokenResponse>
 */
export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TokenResponse & { email?: string; user_info?: GoogleUserInfo }> => {
  try {
    console.log("[Gmail Auth] Starting token exchange...");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Use production Edge Function URL
    const edgeFunctionUrl = `${
      import.meta.env.VITE_SUPABASE_URL
    }/functions/v1/gmail-oauth-callback`;

    console.log("[Gmail Auth] Calling Edge Function at:", edgeFunctionUrl);

    const response = await fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${
          (
            await supabase.auth.getSession()
          ).data.session?.access_token
        }`,
      },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        user_id: user.id,
      }),
    });

    const data = await response.json();
    console.log("[Gmail Auth] Edge Function response:", data);

    if (!response.ok || !data.success) {
      console.error("[Gmail Auth] Edge Function error:", data);
      throw new Error(data.error || "Failed to exchange authorization code");
    }

    console.log("[Gmail Auth] Token exchange successful");
    // The Edge Function returns { success: true, data: { access_token, refresh_token, etc } }
    return data.data;
  } catch (error) {
    console.error("[Gmail Auth] Token exchange error:", error);
    throw error;
  }
};

/**
 * Refreshes an access token using refresh token
 * @param refreshToken - The refresh token
 * @returns Promise<TokenResponse>
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  try {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("Google Client ID not configured");
    }

    const refreshParams: RefreshTokenParams = {
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };

    const response = await fetch(GOOGLE_OAUTH_URLS.TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(
        refreshParams as unknown as Record<string, string>
      ),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Token refresh failed: ${
          errorData.error_description || response.statusText
        }`
      );
    }

    const tokenData: TokenResponse = await response.json();
    return tokenData;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw createAuthError(
      "refresh_failed",
      "Failed to refresh access token",
      error
    );
  }
}

/**
 * Revokes OAuth tokens
 * @param accessToken - The access token to revoke
 * @returns Promise<void>
 */
export async function revokeTokens(accessToken: string): Promise<void> {
  try {
    const revokeParams: RevokeTokenParams = {
      token: accessToken,
    };

    const response = await fetch(GOOGLE_OAUTH_URLS.REVOKE, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(
        revokeParams as unknown as Record<string, string>
      ),
    });

    if (!response.ok) {
      console.warn("Token revocation failed:", response.statusText);
      // Don't throw error for revocation failures as tokens might already be expired
    }
  } catch (error) {
    console.error("Error revoking tokens:", error);
    // Don't throw error for revocation failures
  }
}

/**
 * Gets user info from Google using access token
 * @param accessToken - Valid access token
 * @returns Promise<GoogleUserInfo>
 */
export async function getUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  try {
    const response = await fetch(GOOGLE_OAUTH_URLS.USERINFO, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    const userInfo: GoogleUserInfo = await response.json();
    return userInfo;
  } catch (error) {
    console.error("Error getting user info:", error);
    throw createAuthError(
      "network_error",
      "Failed to get user information",
      error
    );
  }
}

/**
 * Handles the complete OAuth2 flow from callback
 * @param code - Authorization code from callback
 * @param state - State parameter from callback
 * @param redirectUri - The redirect URI used
 * @param userId - Current user's ID
 * @returns Promise<TokenData>
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
  redirectUri: string,
  userId: string
): Promise<TokenData> {
  try {
    // Validate state parameter
    const pkceParams = retrievePKCEParams();
    if (!pkceParams || !validateState(state, pkceParams.state)) {
      throw new Error("Invalid state parameter - possible CSRF attack");
    }

    // Exchange code for tokens (Edge Function handles saving)
    const tokenResponse = await exchangeCodeForTokens(
      code,
      pkceParams.code_verifier,
      redirectUri
    );

    // Clear PKCE params after successful exchange
    clearPKCEParams();

    // Create token data from response
    const tokenData: TokenData = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || "",
      expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000),
      scope: tokenResponse.scope,
      email: tokenResponse.email || "",
      user_info: tokenResponse.user_info,
    };

    // Note: We don't save tokens here because the Edge Function already did it

    return tokenData;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    throw createAuthError(
      "server_error",
      "Failed to complete OAuth flow",
      error
    );
  }
}

/**
 * Initiates the OAuth2 flow
 * @param redirectUri - The redirect URI for the OAuth flow
 * @param scopes - Array of OAuth scopes (optional)
 * @returns Promise<string> - Authorization URL
 */
export async function initiateOAuthFlow(
  redirectUri: string,
  scopes?: string[]
): Promise<string> {
  try {
    const authUrl = await buildAuthUrl(redirectUri, scopes);
    return authUrl;
  } catch (error) {
    console.error("Error initiating OAuth flow:", error);
    throw createAuthError(
      "invalid_request",
      "Failed to initiate OAuth flow",
      error
    );
  }
}

/**
 * Disconnects a Gmail account
 * @param userId - The user's ID
 * @param email - The Gmail account email
 * @returns Promise<void>
 */
export async function disconnectGmailAccount(
  userId: string,
  email: string
): Promise<void> {
  try {
    // Try to revoke tokens first (best effort)
    try {
      // We would need to get the access token first, but for simplicity
      // we'll just delete from database and let tokens expire naturally
    } catch (error) {
      console.warn("Could not revoke tokens:", error);
    }

    // Delete tokens from database
    await deleteTokens(userId, email);
  } catch (error) {
    console.error("Error disconnecting Gmail account:", error);
    throw createAuthError(
      "server_error",
      "Failed to disconnect Gmail account",
      error
    );
  }
}

/**
 * Validates OAuth2 configuration
 * @returns boolean - True if configuration is valid
 */
export function validateOAuthConfig(): boolean {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;

  if (!clientId) {
    console.error("VITE_GOOGLE_CLIENT_ID is not configured");
    return false;
  }

  if (!redirectUri) {
    console.error("VITE_GOOGLE_REDIRECT_URI is not configured");
    return false;
  }

  return true;
}

/**
 * Gets the configured redirect URI
 * @returns string - The redirect URI
 */
export function getRedirectUri(): string {
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error("VITE_GOOGLE_REDIRECT_URI is not configured");
  }
  return redirectUri;
}

/**
 * Gets the configured scopes
 * @returns string[] - Array of OAuth scopes
 */
export function getConfiguredScopes(): string[] {
  const scopes = import.meta.env.VITE_GMAIL_API_SCOPES;
  if (scopes) {
    return scopes.split(",").map((scope: string) => scope.trim());
  }
  return [...GOOGLE_OAUTH_SCOPES];
}

// Helper function to create standardized auth errors
function createAuthError(
  type: AuthErrorType,
  message: string,
  originalError?: any
): AuthFlowError {
  return {
    type,
    code: type,
    message,
    originalError,
    details: originalError?.message || originalError,
  };
}

/**
 * Utility function to check if we're in OAuth callback
 * @returns boolean - True if current URL contains OAuth callback parameters
 */
export function isOAuthCallback(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has("code") && urlParams.has("state");
}

/**
 * Extracts OAuth callback parameters from URL
 * @returns Object with code, state, and error if present
 */
export function extractCallbackParams(): {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
} {
  const urlParams = new URLSearchParams(window.location.search);

  return {
    code: urlParams.get("code") || undefined,
    state: urlParams.get("state") || undefined,
    error: urlParams.get("error") || undefined,
    error_description: urlParams.get("error_description") || undefined,
  };
}

/**
 * Cleans up OAuth callback parameters from URL
 */
export function cleanupCallbackUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");

  window.history.replaceState({}, document.title, url.toString());
}

/**
 * Get the current authenticated user
 * @returns Promise<User | null>
 */
const getUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};
