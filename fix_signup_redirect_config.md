# Fix Signup Redirect URL Configuration

## Problem
The signup redirect URL is pointing to Supabase's auth endpoint instead of your app:
`https://nihnthenxxbkvoisatop.supabase.co/auth/v1/verify?token=...&redirect_to=http://localhost:3000`

## Solution

### Step 1: Update Supabase URL Configuration

Go to your **Supabase Dashboard** → **Authentication** → **URL Configuration** and set:

1. **Site URL**: `https://app.salessheet.ai` (or your production domain)
2. **Redirect URLs**: Add these URLs:
   ```
   https://app.salessheet.ai
   https://app.salessheet.ai/auth
   https://app.salessheet.ai/accept-invitation
   https://app.salessheet.ai/accept-invitation/*
   http://localhost:3000
   http://localhost:3000/auth
   http://localhost:3000/accept-invitation
   http://localhost:3000/accept-invitation/*
   ```

### Step 2: Update Email Template Configuration

In **Supabase Dashboard** → **Authentication** → **Email Templates**:

1. **Confirm signup template**: Update the redirect URL to:
   ```
   {{ .SiteURL }}/auth?token={{ .TokenHash }}&type=signup
   ```

2. **Invite user template**: Update to:
   ```
   {{ .SiteURL }}/accept-invitation?token={{ .TokenHash }}
   ```

### Step 3: Update Environment Variables

Make sure your app's environment variables are correct:

```env
VITE_SUPABASE_URL=https://nihnthenxxbkvoisatop.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Update Supabase Client Configuration

In your `src/integrations/supabase/client.ts`, ensure the auth options are set:

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
```

### Step 5: Test the Flow

1. Try signing up with a new email
2. Check that the confirmation email redirects to your app (not Supabase)
3. Verify that the signup process completes properly

### Additional Notes

- The redirect URL should NOT include the Supabase domain
- Make sure the Site URL matches your production domain
- For development, include localhost URLs in the redirect list
- The email templates should use `{{ .SiteURL }}` to dynamically use the correct domain

### If Issues Persist

1. Check Supabase logs in the Dashboard → Logs
2. Verify that the email templates are using the correct variables
3. Make sure the auth flow type is set to 'pkce' in your client
4. Check browser network tab to see the actual redirect URLs being used 