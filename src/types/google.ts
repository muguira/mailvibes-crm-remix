import { GOOGLE_OAUTH_SCOPES } from '@/constants/store/google'

// Types for Gmail OAuth2 integration

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

export interface TokenData {
  access_token: string
  refresh_token: string
  expires_at: Date
  scope: string
  email?: string
  user_info?: GoogleUserInfo
}

export interface GoogleUserInfo {
  id: string
  email: string
  name: string
  picture?: string
  given_name?: string
  family_name?: string
  locale?: string
}

export interface AuthState {
  code_verifier: string
  code_challenge: string
  state: string
  redirect_uri: string
  scopes: string[]
}

export interface GmailAccount {
  id: string
  user_id: string
  email: string
  name?: string
  picture?: string
  provider: 'gmail'
  sync_enabled: boolean
  last_sync_at?: Date
  created_at: Date
  updated_at: Date
  is_connected: boolean
  token_expires_at?: Date
}

export interface AuthError {
  code: string
  message: string
  details?: any
}

export interface PKCEParams {
  code_verifier: string
  code_challenge: string
  code_challenge_method: 'S256'
}

export interface AuthUrlParams {
  client_id: string
  redirect_uri: string
  response_type: 'code'
  scope: string
  code_challenge: string
  code_challenge_method: 'S256'
  state: string
  access_type: 'offline'
  prompt: 'consent' | 'select_account' | 'select_account consent'
  include_granted_scopes?: string
}

export interface TokenExchangeParams {
  client_id: string
  code: string
  code_verifier: string
  grant_type: 'authorization_code'
  redirect_uri: string
}

export interface RefreshTokenParams {
  client_id: string
  refresh_token: string
  grant_type: 'refresh_token'
}

export interface RevokeTokenParams {
  token: string
}

// Supabase database types
export interface DatabaseTokenRecord {
  id: string
  user_id: string
  email_account_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface DatabaseEmailAccount {
  id: string
  user_id: string
  email: string
  provider: string
  sync_enabled: boolean
  last_sync_at?: string
  created_at: string
  updated_at: string
}

// OAuth2 Flow States
export type AuthFlowState = 'idle' | 'initiating' | 'redirecting' | 'exchanging' | 'storing' | 'complete' | 'error'

// Error types
export type AuthErrorType =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'server_error'
  | 'temporarily_unavailable'
  | 'network_error'
  | 'token_expired'
  | 'refresh_failed'
  | 'storage_error'

export interface AuthFlowError extends AuthError {
  type: AuthErrorType
  state?: AuthFlowState
  originalError?: Error
}

// Configuration types
export interface GoogleOAuthConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
  authUrl: string
  tokenUrl: string
  revokeUrl: string
}

export type GoogleOAuthScope = (typeof GOOGLE_OAUTH_SCOPES)[number]
