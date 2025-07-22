import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth, useIsAuthenticated, useCurrentUser, useAuthLoading, useAuthErrors } from '@/components/auth'

/**
 * Example component showing how to migrate from AuthContext to the new AuthProvider
 *
 * This component demonstrates:
 * - How to use the new hooks
 * - How the API is similar to the old AuthContext
 * - How to access auth state and actions
 */
export const MigrationExample: React.FC = () => {
  // Main auth hook (replaces useAuth from AuthContext)
  const { user, signIn, signOut, isAuthenticated, loading, errors } = useAuth()

  // Specialized hooks for specific use cases
  const isUserAuthenticated = useIsAuthenticated()
  const currentUser = useCurrentUser()
  const authLoading = useAuthLoading()
  const authErrors = useAuthErrors()

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
            {/* Main auth hook usage */}
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
                  <Badge variant={loading.signingIn ? 'default' : 'secondary'}>
                    {loading.signingIn ? 'Signing in...' : 'Idle'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Specialized hooks usage */}
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

          {/* Error display */}
          {(errors.signIn || errors.signUp) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">Error: {errors.signIn || errors.signUp}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSignIn} disabled={loading.signingIn} size="sm">
              {loading.signingIn ? 'Signing in...' : 'Sign In'}
            </Button>
            <Button onClick={handleSignOut} disabled={loading.signingOut} variant="outline" size="sm">
              {loading.signingOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration guide */}
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
              <div className="text-gray-500">// New</div>
              <div>import {'{ useAuth }'} from "@/components/auth";</div>
              <div>const {'{ user, signIn, signOut }'} = useAuth();</div>
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
