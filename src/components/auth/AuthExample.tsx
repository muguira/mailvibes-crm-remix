import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/hooks/useAuthStore'
import React, { useEffect, useState } from 'react'

/**
 * A comprehensive example component demonstrating the complete usage of the Auth slice/store.
 *
 * This educational component showcases all authentication features and best practices:
 * - Accessing and monitoring authentication state
 * - Performing sign-in, sign-up, and sign-out operations
 * - Handling loading states and error management
 * - Checking authentication status and user permissions
 * - Password reset functionality
 * - Role-based access control examples
 * - Proper initialization and cleanup patterns
 *
 * Use this component as a reference for implementing authentication in your own components.
 *
 * @example
 * ```tsx
 * // Include in your app to test authentication flow
 * <AuthExample />
 *
 * // Or use specific patterns from this component:
 * const { isAuthenticated, signIn, user } = useAuthStore()
 * ```
 */
export const AuthExample: React.FC = () => {
  /**
   * Destructured auth store properties and methods
   * This demonstrates the complete API surface of useAuthStore
   */
  const {
    user, // Current authenticated user object
    isInitialized, // Whether auth system has finished initialization
    isEmailVerified, // Email verification status
    loading, // Loading states for various operations
    errors, // Error states for different auth operations
    signIn, // Sign-in method
    signUp, // Sign-up method
    signOut, // Sign-out method
    resetPassword, // Password reset method
    isAuthenticated, // Function to check if user is authenticated
    getUserRole, // Function to get current user's role
    hasPermission, // Function to check specific permissions
    initialize, // Method to initialize auth system
  } = useAuthStore()

  /** Form field for user's email address */
  const [email, setEmail] = useState('')
  /** Form field for user's password */
  const [password, setPassword] = useState('')
  /** Toggle between sign-in and sign-up modes */
  const [isSignUp, setIsSignUp] = useState(false)

  /**
   * Effect to initialize the authentication system on component mount
   * This is a critical pattern - always initialize auth before using other auth methods
   */
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  /**
   * Handles form submission for both sign-in and sign-up operations
   * Demonstrates proper error handling and form state management
   *
   * @param e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isSignUp) {
        await signUp({ email, password })
      } else {
        await signIn({ email, password })
      }

      // Clear form on success - good UX practice
      setEmail('')
      setPassword('')
    } catch (error) {
      // Error is handled by the store and shown via toast
      console.error('Auth error:', error)
    }
  }

  /**
   * Handles password reset functionality
   * Validates email input and calls the resetPassword method
   */
  const handleResetPassword = async () => {
    if (!email) {
      alert('Please enter your email address')
      return
    }

    try {
      await resetPassword(email)
    } catch (error) {
      console.error('Password reset error:', error)
    }
  }

  /**
   * Handles user sign-out operation
   * Demonstrates proper logout flow with error handling
   */
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Loading state - Show while auth system is initializing
  if (!isInitialized) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Initializing authentication...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Authenticated state - Show user dashboard with auth information
  if (isAuthenticated()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome, {user?.email}!</CardTitle>
          <CardDescription>You are successfully authenticated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User information display - demonstrates accessing user data */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User ID:</span>
              <Badge variant="secondary">{user?.id}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email Verified:</span>
              <Badge variant={isEmailVerified ? 'default' : 'destructive'}>{isEmailVerified ? 'Yes' : 'No'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Role:</span>
              <Badge variant="outline">{getUserRole() || 'No role'}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Admin Permission:</span>
              <Badge variant={hasPermission('admin') ? 'default' : 'secondary'}>
                {hasPermission('admin') ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>

          {/* Sign out button with loading state */}
          <Button onClick={handleSignOut} disabled={loading.signingOut} className="w-full" variant="outline">
            {loading.signingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Authentication form state - Show sign-in/sign-up form
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isSignUp ? 'Create Account' : 'Sign In'}</CardTitle>
        <CardDescription>
          {isSignUp ? 'Create a new account to get started' : 'Sign in to your existing account'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {/* Password input field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Error display - Shows authentication errors from the store */}
          {(errors.signIn || errors.signUp) && (
            <Alert variant="destructive">
              <AlertDescription>{errors.signIn || errors.signUp}</AlertDescription>
            </Alert>
          )}

          {/* Loading state indicator - Shows during authentication operations */}
          {(loading.signingIn || loading.signingUp) && (
            <Alert>
              <AlertDescription>{loading.signingIn ? 'Signing in...' : 'Creating account...'}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {/* Primary action button - Submit form */}
            <Button type="submit" disabled={loading.signingIn || loading.signingUp} className="w-full">
              {loading.signingIn || loading.signingUp
                ? loading.signingIn
                  ? 'Signing in...'
                  : 'Creating account...'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
            </Button>

            {/* Toggle between sign-in and sign-up modes */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading.signingIn || loading.signingUp}
              className="w-full"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </Button>
          </div>
        </form>

        {/* Password reset section - Only shown in sign-in mode */}
        {!isSignUp && (
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetPassword}
              disabled={loading.resettingPassword || !email}
              className="w-full text-sm"
            >
              {loading.resettingPassword ? 'Sending reset email...' : 'Forgot password?'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
