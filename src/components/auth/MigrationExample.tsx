import { useAuth, useAuthErrors, useAuthLoading, useCurrentUser, useIsAuthenticated } from '@/components/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'

/**
 * A comprehensive example component demonstrating migration from AuthContext to the new AuthProvider system.
 *
 * This educational component showcases:
 * - Complete API comparison between old and new authentication systems
 * - Usage of all available authentication hooks (general and specialized)
 * - Migration patterns and best practices
 * - Side-by-side demonstration of equivalent functionality
 * - Visual migration guide with code examples
 * - Hands-on testing interface for authentication operations
 *
 * Features demonstrated:
 * - Main useAuth hook (drop-in replacement for old AuthContext)
 * - Specialized hooks for granular state access
 * - Error handling and loading state management
 * - Authentication operations (sign-in, sign-out)
 * - Migration checklist and troubleshooting guide
 *
 * Use this component as:
 * - Reference for migrating existing code
 * - Learning tool for new authentication patterns
 * - Testing interface during development
 * - Documentation for team members
 *
 * @example
 * ```tsx
 * // Include in development/staging for testing migration
 * <MigrationExample />
 *
 * // Reference specific patterns:
 * const { user, signIn } = useAuth() // Main hook
 * const isAuth = useIsAuthenticated() // Specialized hook
 * const user = useCurrentUser() // User-only hook
 * ```
 */
export const MigrationExample: React.FC = () => {
  /**
   * Main authentication hook - direct replacement for old AuthContext useAuth
   * Provides the same API surface for seamless migration
   * Note: loading from useAuth() only provides initializing state (boolean)
   */
  const { user, signIn, signOut, isAuthenticated, loading } = useAuth()

  /**
   * Specialized hooks for granular state access
   * These provide optimized subscriptions for specific use cases
   */
  const isUserAuthenticated = useIsAuthenticated() // Boolean only - optimized for conditional rendering
  const currentUser = useCurrentUser() // User object only - optimized for user display
  const authLoading = useAuthLoading() // Loading states object - optimized for loading indicators
  const authErrors = useAuthErrors() // Error states object - optimized for error displays

  /**
   * Demo function to test sign-in functionality
   * Uses placeholder credentials for demonstration purposes
   */
  const handleSignIn = async () => {
    try {
      await signIn({
        email: 'test@example.com',
        password: 'password123',
      })
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  /**
   * Demo function to test sign-out functionality
   * Demonstrates proper error handling for logout operations
   */
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Migration from AuthContext to AuthProvider</CardTitle>
          <CardDescription>This example shows how to use the new auth system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Main auth hook usage - demonstrates drop-in replacement */}
            <div className="space-y-2">
              <h3 className="font-semibold">Main Hook (useAuth)</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>User:</span>
                  <Badge variant="secondary">{user?.email || 'Not logged in'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Authenticated:</span>
                  <Badge variant={isAuthenticated() ? 'default' : 'destructive'}>
                    {isAuthenticated() ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Loading:</span>
                  <Badge variant={loading ? 'default' : 'secondary'}>{loading ? 'Initializing...' : 'Ready'}</Badge>
                </div>
              </div>
            </div>

            {/* Specialized hooks usage - demonstrates new optimization features */}
            <div className="space-y-2">
              <h3 className="font-semibold">Specialized Hooks</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>useIsAuthenticated:</span>
                  <Badge variant={isUserAuthenticated ? 'default' : 'destructive'}>
                    {isUserAuthenticated ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>useCurrentUser:</span>
                  <Badge variant="secondary">{currentUser?.email || 'None'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>useAuthLoading:</span>
                  <Badge variant={authLoading.signingIn ? 'default' : 'secondary'}>
                    {authLoading.signingIn ? 'Loading' : 'Ready'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Error display - demonstrates error handling patterns */}
          {(authErrors.signIn || authErrors.signUp) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">Error: {authErrors.signIn || authErrors.signUp}</p>
            </div>
          )}

          {/* Action buttons - demonstrate authentication operations */}
          <div className="flex gap-2">
            <Button onClick={handleSignIn} disabled={authLoading.signingIn} size="sm">
              {authLoading.signingIn ? 'Signing in...' : 'Sign In'}
            </Button>
            <Button onClick={handleSignOut} disabled={authLoading.signingOut} variant="outline" size="sm">
              {authLoading.signingOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration guide - comprehensive step-by-step instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Guide</CardTitle>
          <CardDescription>How to migrate from AuthContext to AuthProvider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Replace AuthProvider</h4>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono">
              <div className="text-gray-500">// Old</div>
              <div>import {'{ AuthProvider }'} from "@/contexts/AuthContext";</div>
              <br />
              <div className="text-gray-500">// New</div>
              <div>import {'{ AuthProvider }'} from "@/components/auth";</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Replace useAuth hook</h4>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono">
              <div className="text-gray-500">// Old</div>
              <div>import {'{ useAuth }'} from "@/contexts/AuthContext";</div>
              <div>const {'{ user, signIn, signOut }'} = useAuth();</div>
              <br />
              <div className="text-gray-500">// New - Main hook (same API)</div>
              <div>import {'{ useAuth }'} from "@/components/auth";</div>
              <div>const {'{ user, signIn, signOut }'} = useAuth();</div>
              <br />
              <div className="text-gray-500">// New - Granular hooks for loading states</div>
              <div>import {'{ useAuthLoading }'} from "@/components/auth";</div>
              <div>const loading = useAuthLoading(); // {'{ signingIn, signingOut, ... }'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Use specialized hooks (optional)</h4>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono">
              <div>import {'{ useIsAuthenticated, useCurrentUser }'} from "@/components/auth";</div>
              <div>const isAuthenticated = useIsAuthenticated();</div>
              <div>const user = useCurrentUser();</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">4. Remove old AuthContext</h4>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono">
              <div className="text-gray-500">// Delete these files:</div>
              <div>src/contexts/AuthContext.tsx</div>
              <div>src/contexts/index.ts (if only used for auth)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
