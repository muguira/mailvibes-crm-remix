import { useAuth } from '@/components/auth'
import { Navigate, useLocation } from 'react-router-dom'

/**
 * Props for the ProtectedRoute component
 */
interface ProtectedRouteProps {
  /** The child components that should only be accessible to authenticated users */
  children: React.ReactNode
}

/**
 * A route protection component that ensures only authenticated users can access certain routes.
 *
 * This component provides:
 * - Authentication-based route protection
 * - Automatic redirect to login page for unauthenticated users
 * - Preservation of the originally requested URL for post-login redirect
 * - Seamless integration with React Router navigation
 * - Clean separation of auth logic from route components
 *
 * Key Features:
 * - Uses location state to remember where user was trying to go
 * - Implements the "redirect after login" pattern
 * - Works with any authentication system that provides user state
 * - Lightweight and performant (only renders when needed)
 *
 * @example
 * ```tsx
 * // Protect individual routes
 * <Route
 *   path="/dashboard"
 *   element={
 *     <ProtectedRoute>
 *       <Dashboard />
 *     </ProtectedRoute>
 *   }
 * />
 *
 * // Protect multiple routes
 * <Route path="/admin/*" element={
 *   <ProtectedRoute>
 *     <AdminRoutes />
 *   </ProtectedRoute>
 * } />
 *
 * // Usage in route configuration
 * const protectedRoutes = [
 *   { path: "/profile", element: <ProtectedRoute><Profile /></ProtectedRoute> },
 *   { path: "/settings", element: <ProtectedRoute><Settings /></ProtectedRoute> }
 * ]
 * ```
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  /** Current user from auth store - null if not authenticated */
  const { user } = useAuth()
  /** Current location for preserving intended destination */
  const location = useLocation()

  // Redirect unauthenticated users to login page
  if (!user) {
    // Redirect to auth page while saving the attempted URL in location state
    // This allows the auth page to redirect back here after successful login
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  // User is authenticated - render the protected content
  return <>{children}</>
}
