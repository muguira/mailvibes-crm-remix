import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

/**
 * Example component demonstrating how to use the Auth slice
 *
 * This component shows:
 * - How to access auth state
 * - How to perform auth operations
 * - How to handle loading and error states
 * - How to check authentication status
 */
export const AuthExample: React.FC = () => {
  const {
    user,
    session,
    isInitialized,
    isEmailVerified,
    loading,
    errors,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isAuthenticated,
    getUserRole,
    hasPermission,
    initialize,
  } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  // Initialize auth on component mount
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isSignUp) {
        await signUp({ email, password })
      } else {
        await signIn({ email, password })
      }

      // Clear form on success
      setEmail('')
      setPassword('')
    } catch (error) {
      // Error is handled by the store and shown via toast
      console.error('Auth error:', error)
    }
  }

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

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

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

  if (isAuthenticated()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome, {user?.email}!</CardTitle>
          <CardDescription>You are successfully authenticated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <Button onClick={handleSignOut} disabled={loading.signingOut} className="w-full" variant="outline">
            {loading.signingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </CardContent>
      </Card>
    )
  }

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

          {/* Error display */}
          {(errors.signIn || errors.signUp) && (
            <Alert variant="destructive">
              <AlertDescription>{errors.signIn || errors.signUp}</AlertDescription>
            </Alert>
          )}

          {/* Loading state */}
          {(loading.signingIn || loading.signingUp) && (
            <Alert>
              <AlertDescription>{loading.signingIn ? 'Signing in...' : 'Creating account...'}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button type="submit" disabled={loading.signingIn || loading.signingUp} className="w-full">
              {loading.signingIn || loading.signingUp
                ? loading.signingIn
                  ? 'Signing in...'
                  : 'Creating account...'
                : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
            </Button>

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

        {/* Password reset section */}
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
