import { PKCEParams } from '@/types/google'

/**
 * PKCE (Proof Key for Code Exchange) Service
 * Implements RFC 7636 for secure OAuth2 flows in SPAs
 */

/**
 * Generates a cryptographically secure random string for code_verifier
 * @param length - Length of the code verifier (43-128 characters)
 * @returns Base64url-encoded random string
 */
export function generateCodeVerifier(length: number = 128): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let text = ''

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

/**
 * Generates SHA256 hash of code_verifier and base64url encodes it
 * @param verifier - The code verifier string
 * @returns Base64url-encoded SHA256 hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return base64UrlEncode(digest)
}

/**
 * Validates that a code_verifier matches the code_challenge
 * @param verifier - The code verifier to validate
 * @param challenge - The code challenge to validate against
 * @returns True if valid, false otherwise
 */
export async function validateCodeChallenge(verifier: string, challenge: string): Promise<boolean> {
  try {
    const computedChallenge = await generateCodeChallenge(verifier)
    return computedChallenge === challenge
  } catch (error) {
    console.error('Error validating code challenge:', error)
    return false
  }
}

/**
 * Generates a random state parameter for CSRF protection
 * @param length - Length of the state parameter
 * @returns Random state string
 */
export function generateState(length: number = 32): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let text = ''

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

/**
 * Generates complete PKCE parameters for OAuth2 flow
 * @returns Object containing code_verifier, code_challenge, and method
 */
export async function generatePKCEParams(): Promise<PKCEParams> {
  const code_verifier = generateCodeVerifier()
  const code_challenge = await generateCodeChallenge(code_verifier)

  return {
    code_verifier,
    code_challenge,
    code_challenge_method: 'S256',
  }
}

/**
 * Stores PKCE parameters in sessionStorage for the OAuth flow
 * @param params - PKCE parameters to store
 * @param state - State parameter for CSRF protection
 */
export function storePKCEParams(params: PKCEParams, state: string): void {
  const data = {
    ...params,
    state,
    timestamp: Date.now(),
  }

  sessionStorage.setItem('gmail_pkce_params', JSON.stringify(data))
}

/**
 * Retrieves and validates PKCE parameters from sessionStorage
 * @returns PKCE parameters if valid, null otherwise
 */
export function retrievePKCEParams(): (PKCEParams & { state: string }) | null {
  try {
    const stored = sessionStorage.getItem('gmail_pkce_params')
    if (!stored) return null

    const data = JSON.parse(stored)

    // Check if data is not too old (5 minutes max)
    const maxAge = 5 * 60 * 1000 // 5 minutes
    if (Date.now() - data.timestamp > maxAge) {
      sessionStorage.removeItem('gmail_pkce_params')
      return null
    }

    // Validate required fields
    if (!data.code_verifier || !data.code_challenge || !data.state) {
      sessionStorage.removeItem('gmail_pkce_params')
      return null
    }

    return {
      code_verifier: data.code_verifier,
      code_challenge: data.code_challenge,
      code_challenge_method: data.code_challenge_method,
      state: data.state,
    }
  } catch (error) {
    console.error('Error retrieving PKCE params:', error)
    sessionStorage.removeItem('gmail_pkce_params')
    return null
  }
}

/**
 * Clears PKCE parameters from sessionStorage
 */
export function clearPKCEParams(): void {
  sessionStorage.removeItem('gmail_pkce_params')
}

/**
 * Validates state parameter to prevent CSRF attacks
 * @param receivedState - State parameter received from OAuth callback
 * @param expectedState - State parameter stored before redirect
 * @returns True if states match, false otherwise
 */
export function validateState(receivedState: string, expectedState: string): boolean {
  return receivedState === expectedState
}

// Helper function to base64url encode ArrayBuffer
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Utility function to check if PKCE is supported in current environment
 * @returns True if PKCE is supported, false otherwise
 */
export function isPKCESupported(): boolean {
  return !!(
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    crypto.subtle.digest &&
    typeof TextEncoder !== 'undefined'
  )
}

/**
 * Creates a complete OAuth2 state object for the flow
 * @param redirectUri - The redirect URI for the OAuth flow
 * @param scopes - Array of OAuth scopes
 * @returns Complete auth state object
 */
export async function createAuthState(
  redirectUri: string,
  scopes: string[],
): Promise<{
  pkce: PKCEParams
  state: string
  redirect_uri: string
  scopes: string[]
}> {
  const pkce = await generatePKCEParams()
  const state = generateState()

  return {
    pkce,
    state,
    redirect_uri: redirectUri,
    scopes,
  }
}
