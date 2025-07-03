# Migration Guide: AuthContext → AuthProvider

## Overview

This guide explains how to migrate from the old `AuthContext` to the new `AuthProvider` that uses Zustand for state management.

## Why Migrate?

### Benefits of the New AuthProvider:

1. **Better Performance**: Zustand is more efficient than React Context
2. **Simpler State Management**: No need for Context providers
3. **Better TypeScript Support**: Full type safety with Zustand
4. **Easier Testing**: Zustand stores are easier to test
5. **Consistent Architecture**: Matches the pattern used by Tasks slice
6. **Automatic Integration**: Seamless integration with contacts store

## Migration Steps

### Step 1: Update App.tsx

**Before:**

```tsx
import { AuthProvider as OldAuthProvider } from "@/contexts/AuthContext";

function App() {
  return (
    <OldAuthProvider>
      <YourApp />
    </OldAuthProvider>
  );
}
```

**After:**

```tsx
import { AuthProvider } from "@/components/auth";

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

### Step 2: Update Component Imports

**Before:**

```tsx
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, signIn, signOut } = useAuth();
  // ...
}
```

**After:**

```tsx
import { useAuth } from "@/components/auth";

function MyComponent() {
  const { user, signIn, signOut } = useAuth();
  // ...
}
```

### Step 3: Remove Old Files

Delete these files as they're no longer needed:

- `src/contexts/AuthContext.tsx`
- `src/contexts/index.ts` (if only used for auth)

## API Comparison

### Hook Usage

| Old AuthContext | New AuthProvider | Notes                              |
| --------------- | ---------------- | ---------------------------------- |
| `useAuth()`     | `useAuth()`      | Same API, different implementation |
| `user`          | `user`           | Same                               |
| `session`       | `session`        | Same                               |
| `loading`       | `loading`        | Same                               |
| `signIn()`      | `signIn()`       | Same                               |
| `signUp()`      | `signUp()`       | Same                               |
| `signOut()`     | `signOut()`      | Same                               |

### New Specialized Hooks

The new system provides additional specialized hooks:

```tsx
import {
  useIsAuthenticated,
  useCurrentUser,
  useAuthLoading,
  useAuthErrors,
} from "@/components/auth";

// Check authentication status
const isAuthenticated = useIsAuthenticated();

// Get current user
const user = useCurrentUser();

// Get loading states
const { signingIn, signingUp } = useAuthLoading();

// Get error states
const { signIn, signUp } = useAuthErrors();
```

## Advanced Usage

### Direct Store Access

You can also access the store directly:

```tsx
import { useStore } from "@/stores/index";

function MyComponent() {
  const { authUser, authSignIn, authIsAuthenticated } = useStore();

  // Use authUser, authSignIn, etc.
}
```

### Auth Store Hooks

For more granular control:

```tsx
import { useAuthStore, useAuthState, useAuthActions } from "@/components/auth";

// Full auth store
const authStore = useAuthStore();

// Only state (no actions)
const authState = useAuthState();

// Only actions (no state)
const authActions = useAuthActions();
```

## Breaking Changes

### None!

The new `AuthProvider` maintains the same API as the old `AuthContext`, so there are no breaking changes. Your existing code should work without modifications.

## Testing

### Testing with the New AuthProvider

```tsx
import { render, screen } from "@testing-library/react";
import { AuthProvider } from "@/components/auth";

test("should render authenticated user", () => {
  render(
    <AuthProvider>
      <UserProfile />
    </AuthProvider>
  );

  expect(screen.getByText("Welcome")).toBeInTheDocument();
});
```

### Testing Zustand Store

```tsx
import { renderHook, act } from "@testing-library/react";
import { useAuthStore } from "@/components/auth";

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

1. **"useAuth must be used within an AuthProvider"**

   - Make sure you're using the new `AuthProvider` from `@/components/auth`
   - Remove the old `AuthProvider` from `@/contexts/AuthContext`

2. **Auth not initializing**

   - The new `AuthProvider` handles initialization automatically
   - Check that you're wrapping your app with the new `AuthProvider`

3. **Type errors**

   - Make sure all imports are updated to use `@/components/auth`
   - The new system has better TypeScript support

4. **Contacts not loading**
   - The new system automatically integrates with contacts store
   - No additional setup required

### Debug Mode

Enable debug logging:

```tsx
import { logger } from "@/utils/logger";
logger.setLevel("debug");
```

## Performance Benefits

### Before (AuthContext):

- Context re-renders all consumers on any auth state change
- No selective subscriptions
- Manual optimization required

### After (AuthProvider + Zustand):

- Automatic selective subscriptions
- Only components that use auth state re-render
- Built-in performance optimizations
- Smaller bundle size

## Migration Checklist

- [ ] Update `App.tsx` to use new `AuthProvider`
- [ ] Update all imports from `@/contexts/AuthContext` to `@/components/auth`
- [ ] Test all auth functionality
- [ ] Remove old auth context files
- [ ] Update any tests that use auth
- [ ] Verify contacts integration still works
- [ ] Check for any console errors

## Support

If you encounter any issues during migration:

1. Check the console for error messages
2. Verify all imports are updated
3. Ensure the new `AuthProvider` is wrapping your app
4. Test with the `MigrationExample` component

The new system is designed to be a drop-in replacement, so migration should be straightforward!
