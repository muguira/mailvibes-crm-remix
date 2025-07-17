import { StateCreator } from 'zustand'
import { Session, User } from '@supabase/supabase-js'
import { TSignInInput, TSignUpInput, IAuthErrorState, IAuthRetryConfig } from '@/types/store/auth'
import { TStore } from '@/types/store/store'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/utils/logger'
import { AUTH_ERROR_MESSAGES, AUTH_SUCCESS_MESSAGES, AUTH_VALIDATION_CONFIG } from '@/constants/store/auth'
import { useGmailStore } from '@/stores/gmail/gmailStore'
// Note: useStore import is circular, so we use dynamic import instead

/**
 * Auth slice for Zustand store
 *
 * Manages the complete authentication lifecycle including:
 * - User sign in, sign up, and sign out operations
 * - Session management and refresh
 * - Password reset and update operations
 * - Email verification status
 * - Error handling and retry logic
 * - Integration with contacts store
 * - Real-time auth state changes
 * - User profile management
 *
 * @example
 * ```typescript
 * // Usage in component
 * const { authUser, authSignIn, authSignOut, authIsAuthenticated } = useStore();
 *
 * // Sign in
 * await authSignIn({ email: "user@example.com", password: "password" });
 *
 * // Check authentication status
 * if (authIsAuthenticated()) {
 *   // User is logged in
 * }
 * ```
 */
export const useAuthSlice: StateCreator<
  TStore,
  [['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
  [],
  {
    // Auth state
    authSession: Session | null
    authUser: User | null
    authIsInitialized: boolean
    authLastSyncAt: string | null
    authIsEmailVerified: boolean
    authIsPasswordResetRequested: boolean
    authLoading: {
      signingIn: boolean
      signingUp: boolean
      signingOut: boolean
      resettingPassword: boolean
      updatingPassword: boolean
      initializing: boolean
    }
    authErrors: IAuthErrorState
    authRetryConfig: IAuthRetryConfig

    // Auth actions
    authInitialize: () => Promise<void>
    authReset: () => void
    authSignIn: (credentials: TSignInInput) => Promise<void>
    authSignUp: (credentials: TSignUpInput) => Promise<void>
    authSignOut: () => Promise<void>
    authResetPassword: (email: string) => Promise<void>
    authUpdatePassword: (password: string) => Promise<void>
    authRefreshSession: () => Promise<void>
    authGetSession: () => Promise<Session | null>
    authUpdateUserProfile: (updates: Partial<User>) => Promise<void>
    authIsAuthenticated: () => boolean
    authGetUserRole: () => string | null
    authHasPermission: (permission: string) => boolean
    authClearError: (operation: keyof IAuthErrorState) => void
    authClearAllErrors: () => void
    authSetRetryConfig: (config: Partial<IAuthRetryConfig>) => void
  }
> = (set, get) => ({
  // Auth state
  authSession: null,
  authUser: null,
  authIsInitialized: false,
  authLastSyncAt: null,
  authIsEmailVerified: false,
  authIsPasswordResetRequested: false,
  authLoading: {
    signingIn: false,
    signingUp: false,
    signingOut: false,
    resettingPassword: false,
    updatingPassword: false,
    initializing: false,
  },
  authErrors: {
    signIn: null,
    signUp: null,
    signOut: null,
    resetPassword: null,
    updatePassword: null,
    initialize: null,
  },
  authRetryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
  },

  /**
   * Initialize authentication state by checking current session
   * Sets up auth state change listener for automatic updates
   * @returns Promise that resolves when initialization is complete
   */
  authInitialize: async () => {
    // Prevent multiple initializations
    const currentState = get()
    if (currentState.authIsInitialized) {
      logger.debug('Auth already initialized, skipping...')
      return
    }

    set(state => {
      state.authLoading.initializing = true
      state.authErrors.initialize = null
    })

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) throw error

      if (session?.user) {
        set(state => {
          state.authSession = session
          state.authUser = session.user
          state.authIsEmailVerified = session.user.email_confirmed_at !== null
          state.authLastSyncAt = new Date().toISOString()
        })

        // Initialize contacts store for authenticated user
        logger.log('User authenticated, starting contact preloading...')
        const { useStore } = await import('@/stores/index')
        useStore.getState().contactsInitialize(session.user.id)

        // Initialize Gmail auth for authenticated user
        logger.log('User authenticated, initializing Gmail auth...')
        try {
          await useGmailStore.getState().initializeService(session.user.id)
          // Load accounts after service initialization
          await useGmailStore.getState().loadAccounts()
        } catch (error) {
          logger.error('Error initializing auth:', error)
        }
      }

      // Set up auth state change listener - only once
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        logger.log('Auth state changed:', event, session?.user?.id)

        // Skip if it's the initial session event (we already handled it above)
        if (event === 'INITIAL_SESSION') return

        if (session?.user) {
          set(state => {
            state.authSession = session
            state.authUser = session.user
            state.authIsEmailVerified = session.user.email_confirmed_at !== null
            state.authLastSyncAt = new Date().toISOString()
          })

          // Only initialize contacts on sign in, not on every state change
          if (event === 'SIGNED_IN') {
            logger.log('User signed in, starting contact preloading...')
            const { useStore } = await import('@/stores/index')
            useStore.getState().contactsInitialize(session.user.id)

            // Initialize Gmail auth for signed in user
            logger.log('User signed in, initializing Gmail auth...')
            try {
              await useGmailStore.getState().initializeService(session.user.id)
              // Load accounts after service initialization
              await useGmailStore.getState().loadAccounts()
            } catch (error) {
              logger.error('Error initializing auth:', error)
            }
          }
        } else if (event === 'SIGNED_OUT') {
          set(state => {
            state.authSession = null
            state.authUser = null
            state.authIsEmailVerified = false
            state.authLastSyncAt = new Date().toISOString()
          })

          // Clear contacts when user logs out
          const { useStore } = await import('@/stores/index')
          useStore.getState().contactsClear()

          // Reset Gmail auth when user logs out
          logger.log('User signed out, resetting Gmail auth...')
          get().reset()
        }
      })

      // Store subscription for cleanup if needed
      // You might want to store this in a ref or state for cleanup later

      // Marcamos como inicializado después de configurar todo
      set(state => {
        state.authIsInitialized = true
        state.authLoading.initializing = false
      })
    } catch (error) {
      logger.error('Error initializing auth:', error)
      const errorMessage = error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.INITIALIZATION_FAILED

      // Incluso en caso de error, marcamos como inicializado para evitar bucles
      set(state => {
        state.authErrors.initialize = errorMessage
        state.authIsInitialized = true
        state.authLoading.initializing = false
      })

      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  },

  /**
   * Reset the auth state to its initial values
   * Clears all auth data, errors, and loading states
   */
  authReset: () => {
    set(state => {
      state.authSession = null
      state.authUser = null
      state.authIsInitialized = false
      state.authLastSyncAt = null
      state.authIsEmailVerified = false
      state.authIsPasswordResetRequested = false
      state.authLoading = {
        signingIn: false,
        signingUp: false,
        signingOut: false,
        resettingPassword: false,
        updatingPassword: false,
        initializing: false,
      }
      state.authErrors = {
        signIn: null,
        signUp: null,
        signOut: null,
        resetPassword: null,
        updatePassword: null,
        initialize: null,
      }
    })
  },

  /**
   * Sign in with email and password
   * @param credentials - Email and password for authentication
   * @returns Promise that resolves when sign in is complete
   */
  authSignIn: async (credentials: TSignInInput) => {
    set(state => {
      state.authLoading.signingIn = true
      state.authErrors.signIn = null
    })

    try {
      // Validate input
      if (!AUTH_VALIDATION_CONFIG.EMAIL_REGEX.test(credentials.email)) {
        throw new Error('Invalid email format')
      }

      if (credentials.password.length < AUTH_VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${AUTH_VALIDATION_CONFIG.MIN_PASSWORD_LENGTH} characters`)
      }

      const { data, error } = await supabase.auth.signInWithPassword(credentials)

      if (error) throw error

      if (data.session?.user) {
        set(state => {
          state.authSession = data.session
          state.authUser = data.session.user
          state.authIsEmailVerified = data.session.user.email_confirmed_at !== null
          state.authLastSyncAt = new Date().toISOString()
        })

        toast({
          title: 'Welcome back',
          description: AUTH_SUCCESS_MESSAGES.SIGN_IN_SUCCESS,
        })
      }
    } catch (error) {
      logger.error('Error signing in:', error)
      const errorMessage = error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.SIGN_IN_FAILED
      set(state => {
        state.authErrors.signIn = errorMessage
      })
      toast({
        title: 'Sign In Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    } finally {
      set(state => {
        state.authLoading.signingIn = false
      })
    }
  },

  /**
   * Sign up with email and password
   * @param credentials - Email and password for account creation
   * @returns Promise that resolves when sign up is complete
   */
  authSignUp: async (credentials: TSignUpInput) => {
    set(state => {
      state.authLoading.signingUp = true
      state.authErrors.signUp = null
    })

    try {
      // Validate input
      if (!AUTH_VALIDATION_CONFIG.EMAIL_REGEX.test(credentials.email)) {
        throw new Error('Invalid email format')
      }

      if (credentials.password.length < AUTH_VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${AUTH_VALIDATION_CONFIG.MIN_PASSWORD_LENGTH} characters`)
      }

      if (!AUTH_VALIDATION_CONFIG.PASSWORD_REGEX.test(credentials.password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      }

      const { data, error } = await supabase.auth.signUp(credentials)

      if (error) throw error

      toast({
        title: 'Account created',
        description: AUTH_SUCCESS_MESSAGES.SIGN_UP_SUCCESS,
      })
    } catch (error) {
      logger.error('Error signing up:', error)
      const errorMessage = error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.SIGN_UP_FAILED
      set(state => {
        state.authErrors.signUp = errorMessage
      })
      toast({
        title: 'Sign Up Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    } finally {
      set(state => {
        state.authLoading.signingUp = false
      })
    }
  },

  /**
   * Sign out the current user
   * @returns Promise that resolves when sign out is complete
   */
  authSignOut: async () => {
    set(state => {
      state.authLoading.signingOut = true
      state.authErrors.signOut = null
    })

    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      set(state => {
        state.authSession = null
        state.authUser = null
        state.authIsEmailVerified = false
        state.authLastSyncAt = new Date().toISOString()
      })

      toast({
        title: 'Signed out',
        description: AUTH_SUCCESS_MESSAGES.SIGN_OUT_SUCCESS,
      })
    } catch (error) {
      logger.error('Error signing out:', error)
      const errorMessage = error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.SIGN_OUT_FAILED
      set(state => {
        state.authErrors.signOut = errorMessage
      })
      toast({
        title: 'Sign Out Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    } finally {
      set(state => {
        state.authLoading.signingOut = false
      })
    }
  },

  /**
   * Send password reset email
   * @param email - Email address to send reset link to
   * @returns Promise that resolves when reset email is sent
   */
  authResetPassword: async (email: string) => {
    set(state => {
      state.authLoading.resettingPassword = true
      state.authErrors.resetPassword = null
    })

    try {
      if (!AUTH_VALIDATION_CONFIG.EMAIL_REGEX.test(email)) {
        throw new Error('Invalid email format')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email)

      if (error) throw error

      set(state => {
        state.authIsPasswordResetRequested = true
      })

      toast({
        title: 'Password reset sent',
        description: AUTH_SUCCESS_MESSAGES.PASSWORD_RESET_SENT,
      })
    } catch (error) {
      logger.error('Error resetting password:', error)
      const errorMessage = error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.PASSWORD_RESET_FAILED
      set(state => {
        state.authErrors.resetPassword = errorMessage
      })
      toast({
        title: 'Password Reset Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    } finally {
      set(state => {
        state.authLoading.resettingPassword = false
      })
    }
  },

  /**
   * Update user password
   * @param password - New password
   * @returns Promise that resolves when password is updated
   */
  authUpdatePassword: async (password: string) => {
    set(state => {
      state.authLoading.updatingPassword = true
      state.authErrors.updatePassword = null
    })

    try {
      if (password.length < AUTH_VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${AUTH_VALIDATION_CONFIG.MIN_PASSWORD_LENGTH} characters`)
      }

      if (!AUTH_VALIDATION_CONFIG.PASSWORD_REGEX.test(password)) {
        throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      }

      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      toast({
        title: 'Password updated',
        description: AUTH_SUCCESS_MESSAGES.PASSWORD_UPDATED,
      })
    } catch (error) {
      logger.error('Error updating password:', error)
      const errorMessage = error instanceof Error ? error.message : AUTH_ERROR_MESSAGES.PASSWORD_UPDATE_FAILED
      set(state => {
        state.authErrors.updatePassword = errorMessage
      })
      toast({
        title: 'Password Update Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw error
    } finally {
      set(state => {
        state.authLoading.updatingPassword = false
      })
    }
  },

  /**
   * Refresh the current session
   * @returns Promise that resolves when session is refreshed
   */
  authRefreshSession: async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) throw error

      if (data.session) {
        set(state => {
          state.authSession = data.session
          state.authUser = data.session.user
          state.authIsEmailVerified = data.session.user.email_confirmed_at !== null
          state.authLastSyncAt = new Date().toISOString()
        })
      }
    } catch (error) {
      logger.error('Error refreshing session:', error)
      throw error
    }
  },

  /**
   * Get the current session
   * @returns Promise that resolves with current session or null
   */
  authGetSession: async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) throw error

      return session
    } catch (error) {
      logger.error('Error getting session:', error)
      throw error
    }
  },

  /**
   * Update user profile information
   * @param updates - Partial user data to update
   * @returns Promise that resolves when profile is updated
   */
  authUpdateUserProfile: async (updates: Partial<User>) => {
    try {
      const { data, error } = await supabase.auth.updateUser(updates)

      if (error) throw error

      if (data.user) {
        set(state => {
          state.authUser = data.user
          state.authLastSyncAt = new Date().toISOString()
        })
      }
    } catch (error) {
      logger.error('Error updating user profile:', error)
      throw error
    }
  },

  /**
   * Check if user is currently authenticated
   * @returns boolean indicating if user is authenticated
   */
  authIsAuthenticated: () => {
    const state = get()
    return state.authUser !== null && state.authSession !== null
  },

  /**
   * Get user role from session
   * @returns string role or null if not available
   */
  authGetUserRole: () => {
    const state = get()
    return state.authUser?.user_metadata?.role || null
  },

  /**
   * Check if user has specific permission
   * @param permission - Permission to check
   * @returns boolean indicating if user has permission
   */
  authHasPermission: (permission: string) => {
    const state = get()
    const userPermissions = state.authUser?.user_metadata?.permissions || []
    return userPermissions.includes(permission)
  },

  /**
   * Clear a specific error from the error state
   * @param operation - The operation error to clear
   */
  authClearError: (operation: keyof IAuthErrorState) => {
    set(state => {
      state.authErrors[operation] = null
    })
  },

  /**
   * Clear all errors from the error state
   * Resets all operation errors to null
   */
  authClearAllErrors: () => {
    set(state => {
      state.authErrors = {
        signIn: null,
        signUp: null,
        signOut: null,
        resetPassword: null,
        updatePassword: null,
        initialize: null,
      }
    })
  },

  /**
   * Update the retry configuration for failed operations
   * @param config - Partial retry configuration to merge with existing config
   */
  authSetRetryConfig: (config: Partial<IAuthRetryConfig>) => {
    set(state => {
      Object.assign(state.authRetryConfig, config)
    })
  },
})
