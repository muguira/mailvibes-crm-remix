import { useAuthStore } from '@/hooks/useAuthStore'
import React, { ReactNode, useEffect, useRef } from 'react'
// import { useStore } from "@/stores";
import { logger } from '@/utils/logger'

/**
 * Props for the AuthProvider component
 */
interface AuthProviderProps {
  /** The child components that will have access to authentication context */
  children: ReactNode
}

/**
 * AuthProvider component that replaces the old AuthContext and provides authentication state management.
 *
 * This component serves as the authentication wrapper for the entire application and handles:
 * - Automatic initialization of the authentication system from Zustand store
 * - One-time setup to prevent initialization loops
 * - Loading state management during auth initialization
 * - Error handling for initialization failures
 * - Integration with other stores (contacts, tasks) when ready
 * - Graceful fallback when initialization fails
 *
 * Key Features:
 * - Uses Zustand instead of React Context for better performance
 * - Automatic auth state persistence and restoration
 * - Prevents infinite re-initialization with ref-based tracking
 * - Shows loading spinner during initialization
 * - Fails gracefully and allows app to continue on errors
 *
 * @example
 * ```tsx
 * // Wrap your entire app
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Router>
 *         <Routes>
 *           <Route path="/" element={<HomePage />} />
 *         </Routes>
 *       </Router>
 *     </AuthProvider>
 *   )
 * }
 *
 * // Then use auth hooks in any child component
 * function SomeComponent() {
 *   const { user, isAuthenticated } = useAuth()
 *   return <div>{user?.email}</div>
 * }
 * ```
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  /** Auth store state and methods from Zustand */
  const { isInitialized, initialize, loading, errors } = useAuthStore()
  /** Ref to prevent double initialization - critical for avoiding infinite loops */
  const hasInitializedRef = useRef(false)
  // const store = useStore(); // Future: integrate with other stores

  /**
   * Effect to initialize authentication state exactly once on component mount
   *
   * Uses a ref-based tracking system to ensure initialization only happens once,
   * even if the component re-renders or if React runs effects multiple times.
   * This is critical for preventing initialization loops and unnecessary API calls.
   */
  useEffect(() => {
    /**
     * Async function to handle auth initialization
     * Wrapped in try-catch to gracefully handle initialization failures
     */
    const initAuth = async () => {
      if (!hasInitializedRef.current && !isInitialized) {
        hasInitializedRef.current = true
        logger.log('AuthProvider: Initializing auth state...')
        try {
          await initialize()
        } catch (error) {
          logger.error('AuthProvider: Failed to initialize auth state:', error)
          // Don't retry on errors - let the user refresh the page if needed
          // This prevents infinite loops when there are persistent errors
        }
      }
    }

    initAuth()
  }, []) // Empty dependencies - only run once on mount

  /**
   * Future enhancement: Initialize other stores when user is authenticated
   * This will automatically set up tasks, contacts, and other user-specific data
   *
   * useEffect(() => {
   *   const user = store.authUser;
   *   const tasksInitialized = store.isInitialized;
   *
   *   if (user && !tasksInitialized && !store.loading.fetching) {
   *     logger.log('AuthProvider: Initializing tasks for user:', user.id);
   *     store.initialize();
   *   }
   * }, [store.authUser, store.isInitialized, store.loading.fetching]);
   */

  // Loading state - Only show loading during initial auth setup
  if (loading.initializing && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Initializing authentication...</p>
          {/* Show initialization errors if they occur */}
          {errors.initialize && <p className="mt-2 text-sm text-red-600">{errors.initialize}</p>}
        </div>
      </div>
    )
  }

  // Normal state - Render children when initialization is complete or failed
  // If initialization failed but we're not loading, we still show the app
  // This prevents getting stuck in a loading state due to persistent errors
  return <>{children}</>
}
