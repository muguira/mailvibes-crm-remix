import { AUTH_ERROR_MESSAGES, AUTH_SUCCESS_MESSAGES, AUTH_VALIDATION_CONFIG } from '@/constants/store/auth'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { IAuthErrorState, IAuthRetryConfig, TSignInInput, TSignUpInput } from '@/types/store/auth'
import { TStore } from '@/types/store/store'
import { logger } from '@/utils/logger'
import { Session, User } from '@supabase/supabase-js'
import { StateCreator } from 'zustand'
// RESTORED: Gmail store with fixed selectors
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

        // NOTE: Gmail initialization removed from here to prevent duplicate initialization
        // Gmail will be initialized by the auth state change listener on SIGNED_IN event
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

            // NEW: Check for pending invitations and auto-accept them
            if (session.user.email) {
              try {
                logger.log('🔍 Checking for pending invitations...')
                const { checkAndAcceptPendingInvitations } = await import('@/services/invitationService')
                const result = await checkAndAcceptPendingInvitations(session.user.email, session.user.id)
                
                if (result.hasOrganization && result.wasAutoAccepted) {
                  logger.log('✅ User auto-assigned to organization via invitation')
                  // Reload organization store to reflect the new organization
                  const { useOrganizationStore } = await import('@/stores/organizationStore')
                  await useOrganizationStore.getState().loadOrganization()
                  logger.log('🏢 Organization data loaded after auto-acceptance')
                } else if (result.message && !result.hasOrganization) {
                  logger.warn('⚠️ Issue with invitation acceptance:', result.message)
                }
              } catch (error) {
                logger.error('❌ Error checking pending invitations:', error)
                // Don't throw - we don't want to break the sign-in process
              }
            }

            // RESTORED: Auto-initialization with granular selectors (safe with timeout)
            // Initialize Gmail auth for signed in user with delay to avoid conflicts
            logger.log('User signed in, scheduling Gmail initialization...')
            setTimeout(async () => {
              try {
                logger.log('Initializing Gmail service...')
                await useGmailStore.getState().initializeService(session.user.id)
                // Load accounts after service initialization
                await useGmailStore.getState().loadAccounts()
                logger.log('Gmail initialization completed successfully')
              } catch (error) {
                logger.error('Error initializing Gmail auth:', error)
              }
            }, 1000) // 1 second delay to let the UI settle
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

          // Reset organization store when user logs out (clears session cache)
          const { useOrganizationStore } = await import('@/stores/organizationStore')
          useOrganizationStore.getState().reset()
          logger.log('User signed out, organization cache cleared')

          // RESTORED: Gmail reset with fixed selectors
          // Reset Gmail auth when user logs out
          logger.log('User signed out, resetting Gmail auth...')
          useGmailStore.getState().reset()
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

      if (error) {
        // Check if the error is due to missing session (user already logged out)
        if (error.message.includes('Auth session missing') || error.name === 'AuthSessionMissingError') {
          logger.debug('No active session found during logout - user already logged out')
          // Don't throw error, just proceed with local cleanup
        } else {
          throw error
        }
      }

      // Always clear local state regardless of Supabase response
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

      // Even if there's an error, we should still clear local state
      // The user clicked logout, so we should honor that intent
      set(state => {
        state.authSession = null
        state.authUser = null
        state.authIsEmailVerified = false
        state.authLastSyncAt = new Date().toISOString()
        state.authErrors.signOut = errorMessage
      })

      toast({
        title: 'Signed out',
        description: 'Signed out locally (server error: ' + errorMessage + ')',
        variant: 'default', // Changed from 'destructive' since we still completed the logout
      })

      // Don't throw error - we want logout to always succeed from user perspective
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
