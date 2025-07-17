// Consolidate all Gmail integration types
// This file centralizes types for the new service layer architecture

import type { GmailAccount } from '@/types/google'
import type { GmailEmail, GmailApiResponse } from '@/services/google/gmailApi'
import type { GoogleContact } from '@/services/google/peopleApi'

// Re-export existing types from the main Google types file
export * from '@/types/google'

// Service Configuration
export interface GmailServiceConfig {
  userId: string
  maxRetries?: number
  cacheTTL?: number // Time to live for cache in milliseconds
  enableLogging?: boolean
  apiTimeout?: number // API request timeout in milliseconds
}

// Service Operation Results
export interface ConnectionResult {
  success: boolean
  account?: GmailAccount
  error?: string
  redirectUrl?: string // For OAuth flow
}

export interface SyncResult {
  success: boolean
  emailsSynced: number
  emailsCreated: number
  emailsUpdated: number
  contactEmail?: string
  lastSyncAt?: Date
  error?: string
}

export interface ImportResult {
  success: boolean
  contactsImported: number
  contactsSkipped: number
  contactsDuplicated: number
  totalContacts: number
  error?: string
}

// Service Options
export interface SyncOptions {
  maxEmails?: number
  forceFullSync?: boolean
  skipCache?: boolean
  onProgress?: (progress: SyncProgress) => void
}

export interface GetEmailsOptions {
  maxResults?: number
  preferDatabase?: boolean
  maxAge?: number // Max age in milliseconds for database cache
  pageToken?: string
  includeAttachments?: boolean
}

export interface SearchOptions {
  maxResults?: number
  query?: string
  dateRange?: {
    from?: Date
    to?: Date
  }
  labels?: string[]
  hasAttachment?: boolean
}

export interface ImportOptions {
  maxContacts?: number
  skipDuplicates?: boolean
  targetListId?: string
  onProgress?: (progress: ImportProgress) => void
}

// Progress Tracking
export interface SyncProgress {
  current: number
  total: number
  contactEmail: string
  phase: 'fetching' | 'processing' | 'saving'
}

export interface ImportProgress {
  current: number
  total: number
  phase: 'fetching' | 'processing' | 'deduplicating' | 'saving'
}

// Token Management
export interface TokenStatus {
  isValid: boolean
  expiresAt?: Date
  needsRefresh: boolean
  email: string
  lastRefreshAt?: Date
  failedAttempts: number
}

// Health Check
export interface HealthStatus {
  isHealthy: boolean
  services: {
    auth: ServiceHealth
    email: ServiceHealth
    contacts: ServiceHealth
  }
  lastCheck: Date
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  responseTime?: number
}

// Error Types
export interface GmailError extends Error {
  code: GmailErrorCode
  context?: string
  retryable: boolean
  originalError?: unknown
}

export enum GmailErrorCode {
  // Auth errors
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_REFRESH_FAILED = 'AUTH_REFRESH_FAILED',
  AUTH_NO_ACCOUNT = 'AUTH_NO_ACCOUNT',

  // API errors
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_NETWORK_ERROR = 'API_NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_PERMISSION_DENIED = 'API_PERMISSION_DENIED',

  // Database errors
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',

  // Service errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SERVICE_CONFIGURATION_ERROR = 'SERVICE_CONFIGURATION_ERROR',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Cache Types
export interface CacheEntry<T> {
  data: T
  timestamp: Date
  ttl: number
  key: string
}

export interface EmailCache {
  [contactEmail: string]: CacheEntry<GmailEmail[]>
}

// Service State Types (for internal use)
export interface ServiceState {
  isInitialized: boolean
  isDisposed: boolean
  lastActivity: Date
  errorCount: number
}

// Note: Types are already re-exported via export * from '@/types/google' above
// Additional specific exports for service layer types

// Utility types
export type ServiceMethod<T = any> = (...args: any[]) => Promise<T>
export type ServiceEventListener = (event: ServiceEvent) => void

export interface ServiceEvent {
  type: 'auth' | 'sync' | 'import' | 'error'
  data: any
  timestamp: Date
  serviceId: string
}
