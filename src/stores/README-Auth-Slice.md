# Auth Slice Documentation

## Overview

The Auth slice is a comprehensive authentication management system built with Zustand that handles all authentication-related operations including sign in, sign up, sign out, password management, and session handling. It follows the same patterns as the Tasks slice and integrates seamlessly with Supabase.

## Features

- **Complete Authentication Flow**: Sign in, sign up, sign out
- **Session Management**: Automatic session refresh and state synchronization
- **Password Operations**: Reset and update password functionality
- **Email Verification**: Track email verification status
- **Error Handling**: Comprehensive error management with retry logic
- **Loading States**: Granular loading states for all operations
- **Real-time Updates**: Automatic auth state change detection
- **Integration**: Seamless integration with contacts store and other parts of the app

## File Structure

```
src/
├── stores/
│   ├── useAuthSlice.ts          # Main auth slice implementation
│   └── index.ts                 # Store configuration (updated)
├── types/store/
│   ├── auth.ts                  # Auth-specific types
│   └── store.ts                 # Combined store types (updated)
├── constants/store/
│   └── auth.ts                  # Auth constants and configurations
├── hooks/
│   └── useAuthStore.ts          # Custom hooks for auth
└── components/auth/
    └── AuthExample.tsx          # Example usage component
```

## Usage

### Basic Usage

```typescript
import { useAuthStore } from "@/hooks/useAuthStore";

const MyComponent = () => {
  const { user, signIn, signOut, isAuthenticated, loading } = useAuthStore();

  const handleSignIn = async () => {
    try {
      await signIn({ email: "user@example.com", password: "password" });
    } catch (error) {
      // Error is handled by the store and shown via toast
      console.error("Sign in failed:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (isAuthenticated()) {
    return <div>Welcome, {user?.email}!</div>;
  }

  return <button onClick={handleSignIn}>Sign In</button>;
};
```

### Using Individual Hooks

```typescript
import { useAuthState, useAuthActions } from "@/hooks/useAuthStore";

// For components that only need to read auth state
const AuthStatus = () => {
  const { user, isAuthenticated, loading } = useAuthState();

  if (loading.initializing) return <div>Loading...</div>;

  return isAuthenticated() ? (
    <div>Logged in as {user?.email}</div>
  ) : (
    <div>Not logged in</div>
  );
};

// For components that only need to perform auth actions
const AuthButtons = () => {
  const { signIn, signOut } = useAuthActions();

  return (
    <div>
      <button
        onClick={() =>
          signIn({ email: "test@example.com", password: "password" })
        }
      >
        Sign In
      </button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};
```

### Direct Store Access

```typescript
import { useStore } from "@/stores/index";

const MyComponent = () => {
  const { authUser, authSignIn, authIsAuthenticated } = useStore();

  // Use authUser, authSignIn, etc.
};
```

## API Reference

### State Properties

| Property                       | Type                | Description                          |
| ------------------------------ | ------------------- | ------------------------------------ |
| `authSession`                  | `Session \| null`   | Current Supabase session             |
| `authUser`                     | `User \| null`      | Current authenticated user           |
| `authIsInitialized`            | `boolean`           | Whether auth has been initialized    |
| `authLastSyncAt`               | `string \| null`    | Timestamp of last sync               |
| `authIsEmailVerified`          | `boolean`           | Whether user's email is verified     |
| `authIsPasswordResetRequested` | `boolean`           | Whether password reset was requested |
| `authLoading`                  | `IAuthLoadingState` | Loading states for all operations    |
| `authErrors`                   | `IAuthErrorState`   | Error states for all operations      |
| `authRetryConfig`              | `IAuthRetryConfig`  | Retry configuration                  |

### Actions

#### Authentication Operations

- `authInitialize()`: Initialize auth state and set up listeners
- `authSignIn(credentials)`: Sign in with email and password
- `authSignUp(credentials)`: Create new account
- `authSignOut()`: Sign out current user
- `authReset()`: Reset auth state to initial values

#### Password Operations

- `authResetPassword(email)`: Send password reset email
- `authUpdatePassword(password)`: Update user password

#### Session Operations

- `authRefreshSession()`: Refresh current session
- `authGetSession()`: Get current session
- `authUpdateUserProfile(updates)`: Update user profile

#### Utility Functions

- `authIsAuthenticated()`: Check if user is authenticated
- `authGetUserRole()`: Get user role from metadata
- `authHasPermission(permission)`: Check if user has specific permission

#### Error Management

- `authClearError(operation)`: Clear specific error
- `authClearAllErrors()`: Clear all errors
- `authSetRetryConfig(config)`: Update retry configuration

### Loading States

```typescript
interface IAuthLoadingState {
  signingIn: boolean;
  signingUp: boolean;
  signingOut: boolean;
  resettingPassword: boolean;
  updatingPassword: boolean;
  initializing: boolean;
}
```

### Error States

```typescript
interface IAuthErrorState {
  signIn: string | null;
  signUp: string | null;
  signOut: string | null;
  resetPassword: string | null;
  updatePassword: string | null;
  initialize: string | null;
}
```

## Configuration

### Validation Rules

The auth slice includes built-in validation:

- **Email**: Must be valid email format
- **Password**: Minimum 8 characters, must contain uppercase, lowercase, and number
- **Password Reset**: Email must be valid format

### Retry Configuration

```typescript
interface IAuthRetryConfig {
  maxRetries: number; // Default: 3
  retryDelay: number; // Default: 1000ms
  backoffMultiplier: number; // Default: 2
}
```

### Error Messages

Predefined error messages are available in `AUTH_ERROR_MESSAGES`:

```typescript
const AUTH_ERROR_MESSAGES = {
  SIGN_IN_FAILED: "Failed to sign in. Please check your credentials.",
  SIGN_UP_FAILED: "Failed to create account. Please try again.",
  SIGN_OUT_FAILED: "Failed to sign out. Please try again.",
  // ... more messages
};
```

## Integration with Existing Code

### Replacing AuthContext

To migrate from the existing `AuthContext` to the new Auth slice:

1. **Replace context usage**:

   ```typescript
   // Old
   const { user, signIn, signOut } = useAuth();

   // New
   const { user, signIn, signOut } = useAuthStore();
   ```

2. **Update initialization**:

   ```typescript
   // Old: AuthProvider handles initialization
   // New: Call initialize() in your app root
   useEffect(() => {
     if (!isInitialized) {
       initialize();
     }
   }, [isInitialized, initialize]);
   ```

3. **Remove AuthProvider**: The AuthProvider is no longer needed as Zustand handles state management.

### Integration with Contacts Store

The auth slice automatically integrates with the contacts store:

- When a user signs in, contacts are automatically loaded
- When a user signs out, contacts are automatically cleared
- This happens through the auth state change listener

## Best Practices

### 1. Initialize Early

Always initialize auth early in your app:

```typescript
// In your App.tsx or main component
const App = () => {
  const { isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  if (!isInitialized) {
    return <LoadingSpinner />;
  }

  return <YourApp />;
};
```

### 2. Handle Loading States

Always check loading states before performing operations:

```typescript
const { loading, signIn } = useAuthStore();

const handleSignIn = async () => {
  if (loading.signingIn) return; // Prevent multiple requests

  await signIn(credentials);
};
```

### 3. Use Error Handling

Errors are automatically handled and shown via toast, but you can also access them:

```typescript
const { errors, clearError } = useAuthStore();

// Clear specific error
useEffect(() => {
  if (errors.signIn) {
    clearError("signIn");
  }
}, [errors.signIn, clearError]);
```

### 4. Check Authentication Status

Use the `isAuthenticated()` function to check auth status:

```typescript
const { isAuthenticated } = useAuthStore();

if (isAuthenticated()) {
  // User is logged in
} else {
  // User is not logged in
}
```

## Migration Guide

### From AuthContext to Auth Slice

1. **Install the new slice** (already done)
2. **Update imports**:

   ```typescript
   // Remove
   import { useAuth } from "@/contexts/AuthContext";

   // Add
   import { useAuthStore } from "@/hooks/useAuthStore";
   ```

3. **Update component usage**:

   ```typescript
   // Old
   const { user, signIn, signOut } = useAuth();

   // New
   const { user, signIn, signOut } = useAuthStore();
   ```

4. **Remove AuthProvider** from your app
5. **Add initialization** to your app root

### Testing

The auth slice can be tested using the same patterns as other Zustand stores:

```typescript
import { renderHook, act } from "@testing-library/react";
import { useAuthStore } from "@/hooks/useAuthStore";

test("should sign in user", async () => {
  const { result } = renderHook(() => useAuthStore());

  await act(async () => {
    await result.current.signIn({
      email: "test@example.com",
      password: "password",
    });
  });

  expect(result.current.isAuthenticated()).toBe(true);
});
```

## Troubleshooting

### Common Issues

1. **"useAuth must be used within an AuthProvider"**: Remove AuthProvider and use the new hooks
2. **Auth not initializing**: Make sure to call `initialize()` early in your app
3. **Contacts not loading**: Auth slice automatically handles this, check if user is authenticated
4. **Type errors**: Make sure all imports are updated to use the new types

### Debug Mode

Enable debug logging by setting the logger level:

```typescript
import { logger } from "@/utils/logger";
logger.setLevel("debug");
```

This will show detailed logs of all auth operations.

## Future Enhancements

- [ ] Add OAuth providers (Google, GitHub, etc.)
- [ ] Add multi-factor authentication
- [ ] Add session persistence across browser tabs
- [ ] Add automatic session refresh
- [ ] Add user roles and permissions system
- [ ] Add audit logging for auth events
