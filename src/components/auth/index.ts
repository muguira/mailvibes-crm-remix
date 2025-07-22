/**
 * Authentication module exports
 *
 * This module provides a complete authentication system built on Zustand for state management.
 * It replaces the old AuthContext pattern with better performance and developer experience.
 */

// Auth Provider Component - Wrap your app with this
export { AuthProvider } from './AuthProvider'

// Auth Store and Hooks - Main authentication API
export {
  useAuth, // State-only hook (no actions)
  useAuthActions, // Loading states only
  useAuthErrors, // Optimized user-only hook
  useAuthLoading, // Full auth store access
  useAuthState,
  useAuthStore, // Optimized boolean-only hook
  useCurrentUser, // Main hook - drop-in replacement for old useAuth
  useIsAuthenticated,
} from '@/hooks/useAuthStore'

// Example and Educational Components
export { AuthExample } from './AuthExample' // Complete auth demo
export { MigrationExample } from './MigrationExample' // Migration guide
