import { useStore } from '@/stores/index'
import { Session, User } from '@supabase/supabase-js'
import { useEffect } from 'react'
import { IAuthErrorState, IAuthRetryConfig, TSignInInput, TSignUpInput } from '@/types/store/auth'

/**
 * Custom hook for accessing auth state and actions from the store
 *
 * Provides a clean interface to all auth-related functionality
 *
 * @example
 * ```typescript
 * const { user, signIn, signOut, isAuthenticated, loading } = useAuthStore();
 *
 * // Sign in
 * await signIn({ email: "user@example.com", password: "password" });
 *
 * // Check if user is authenticated
 * if (isAuthenticated) {
 *   // User is logged in
 * }
 * ```
 */
export const useAuthStore = () => {
  const store = useStore()

  return {
    // Auth state
    session: store.authSession,
    user: store.authUser,
    isInitialized: store.authIsInitialized,
    lastSyncAt: store.authLastSyncAt,
    isEmailVerified: store.authIsEmailVerified,
    isPasswordResetRequested: store.authIsPasswordResetRequested,
    loading: store.authLoading,
    errors: store.authErrors,
    retryConfig: store.authRetryConfig,

    // Auth actions
    initialize: store.authInitialize,
    reset: store.authReset,
    signIn: store.authSignIn,
    signUp: store.authSignUp,
    signOut: store.authSignOut,
    resetPassword: store.authResetPassword,
    updatePassword: store.authUpdatePassword,
    refreshSession: store.authRefreshSession,
    getSession: store.authGetSession,
    updateUserProfile: store.authUpdateUserProfile,
    isAuthenticated: store.authIsAuthenticated,
    getUserRole: store.authGetUserRole,
    hasPermission: store.authHasPermission,
    clearError: store.authClearError,
    clearAllErrors: store.authClearAllErrors,
    setRetryConfig: store.authSetRetryConfig,
  }
}

/**
 * Hook for accessing only auth state (no actions)
 * Useful for components that only need to read auth state
 *
 * @example
 * ```typescript
 * const { user, isAuthenticated, loading } = useAuthState();
 * ```
 */
export const useAuthState = () => {
  const store = useStore()

  return {
    session: store.authSession,
    user: store.authUser,
    isInitialized: store.authIsInitialized,
    lastSyncAt: store.authLastSyncAt,
    isEmailVerified: store.authIsEmailVerified,
    isPasswordResetRequested: store.authIsPasswordResetRequested,
    loading: store.authLoading,
    errors: store.authErrors,
    retryConfig: store.authRetryConfig,
  }
}

/**
 * Hook for accessing only auth actions
 * Useful for components that only need to perform auth operations
 *
 * @example
 * ```typescript
 * const { signIn, signOut, resetPassword } = useAuthActions();
 * ```
 */
export const useAuthActions = () => {
  const store = useStore()

  return {
    initialize: store.authInitialize,
    reset: store.authReset,
    signIn: store.authSignIn,
    signUp: store.authSignUp,
    signOut: store.authSignOut,
    resetPassword: store.authResetPassword,
    updatePassword: store.authUpdatePassword,
    refreshSession: store.authRefreshSession,
    getSession: store.authGetSession,
    updateUserProfile: store.authUpdateUserProfile,
    isAuthenticated: store.authIsAuthenticated,
    getUserRole: store.authGetUserRole,
    hasPermission: store.authHasPermission,
    clearError: store.authClearError,
    clearAllErrors: store.authClearAllErrors,
    setRetryConfig: store.authSetRetryConfig,
  }
}

/**
 * Hook for accessing auth state with automatic initialization
 *
 * Esta versión asegura que el estado de auth esté inicializado antes de devolverlo
 */
export const useAuth = () => {
  const authStore = useAuthStore()

  useEffect(() => {
    if (!authStore.isInitialized && !authStore.loading.initializing) {
      authStore.initialize()
    }
  }, [authStore.isInitialized, authStore.loading.initializing, authStore.initialize])

  // Solo devolvemos loading.initializing como el estado de carga principal
  return {
    ...authStore,
    loading: authStore.loading.initializing,
  }
}

/**
 * Hook para saber si el usuario está autenticado
 */
export const useIsAuthenticated = () => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated()
}

/**
 * Hook para obtener el usuario actual
 */
export const useCurrentUser = () => {
  const { user } = useAuthStore()
  return user
}

/**
 * Hook para obtener los estados de loading de auth
 */
export const useAuthLoading = () => {
  const { loading } = useAuthStore()
  return loading
}

/**
 * Hook para obtener los errores de auth
 */
export const useAuthErrors = () => {
  const { errors } = useAuthStore()
  return errors
}
