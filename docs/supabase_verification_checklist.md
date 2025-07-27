# Supabase Configuration Verification Checklist

## Quick Verification Steps

### 1. Environment Setup ✅ (Now Fixed)

- [x] **Supabase Client**: Updated to use environment variables
- [x] **Environment Variables**: Added to `env.example`
- [ ] **Local .env File**: Create your local `.env` file with:

```env
VITE_SUPABASE_URL=https://nihnthenxxbkvoisatop.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paG50aGVueHhia3ZvaXNhdG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNjY2MDQsImV4cCI6MjA2MTc0MjYwNH0.wjkBOFFcmPbwdTDJVbZzcOWhFYwfuFjRBhg00sWoYxk
```

### 2. Supabase Dashboard Configuration

Based on your screenshots, verify these settings in **Supabase Dashboard**:

#### URL Configuration
- [ ] **Site URL**: Set to `https://app.salessheet.ai`
- [ ] **Redirect URLs**: Includes all URLs from your current setup:
  ```
  https://app.salessheet.ai
  https://app.salessheet.ai/auth
  https://app.salessheet.ai/accept-invitation
  https://app.salessheet.ai/accept-invitation/*
  http://localhost:3000
  http://localhost:3000/auth
  http://localhost:3000/accept-invitation
  http://localhost:3000/accept-invitation/*
  http://localhost:3000/auth/reset-password
  http://localhost:3000/auth/forgot-password
  https://app.salessheet.ai/auth/reset-password
  https://app.salessheet.ai/auth/forgot-password
  ```

#### Email Templates
- [ ] **Reset Password Subject**: "Reset your password for SalesSheet AI CRM" ✅
- [ ] **Reset Password URL**: `{{ .SiteURL }}/auth/reset-password?access_token={{ .TokenHash }}&refresh_token={{ .RefreshToken }}&type=recovery`
- [ ] **Invite User Subject**: "You have been invited" ✅
- [ ] **Invite User URL**: `{{ .SiteURL }}/accept-invitation?access_token={{ .TokenHash }}&type=invite`

### 3. Application Testing

#### Test Password Reset Flow
1. [ ] **Start Reset**: Go to `http://localhost:3000/auth/forgot-password`
2. [ ] **Request Reset**: Enter your email and click "Send Reset Link"
3. [ ] **Check Email**: Verify you receive email with correct subject
4. [ ] **Click Link**: Email link should redirect to `/auth/reset-password` with tokens
5. [ ] **Reset Password**: Enter new password and confirm
6. [ ] **Sign In**: Use new password to sign in successfully

#### Test Authentication Guards
1. [ ] **Protected Routes**: Verify `/` redirects to `/auth/login` when not logged in
2. [ ] **Auth Routes**: Verify `/auth/login` redirects to `/` when already logged in
3. [ ] **Session Persistence**: Refresh page while logged in - should stay logged in

#### Test Error Handling
1. [ ] **Invalid Email**: Try invalid email format in forgot password
2. [ ] **Weak Password**: Try password that doesn't meet requirements
3. [ ] **Expired Link**: Test with old/invalid reset link (should show error)

### 4. Browser Console Checks

Open browser console and look for:
- [ ] **No Supabase Errors**: Should not see "Missing required Supabase environment variables"
- [ ] **Auth Initialization**: Should see "Auth already initialized" or successful init
- [ ] **Session Detection**: Should see auth state changes logged properly

### 5. Common Issues to Check

#### If Password Reset Email Not Received:
- [ ] Check spam/junk folder
- [ ] Verify email address exists in your user table
- [ ] Check Supabase > Authentication > Users for the email
- [ ] Look at Supabase > Authentication > Email rate limits

#### If Reset Link Shows "Invalid":
- [ ] Verify URL has both `access_token` and `type=recovery` parameters
- [ ] Check link hasn't expired (1 hour limit)
- [ ] Ensure redirect URLs are correctly configured

#### If Environment Variables Not Working:
- [ ] Restart development server after creating `.env`
- [ ] Verify `.env` file is in project root (not in src/)
- [ ] Check variable names match exactly (case-sensitive)

### 6. Production Considerations

Before deploying to production:
- [ ] **Update Site URL**: Change to production domain in Supabase
- [ ] **Production Redirect URLs**: Add production URLs to redirect list
- [ ] **SSL Certificate**: Ensure HTTPS is properly configured
- [ ] **Environment Variables**: Set up production environment variables securely

### 7. Advanced Verification

#### Supabase Auth Events
Check these work correctly:
- [ ] **SIGNED_IN**: User state updates correctly on sign in
- [ ] **SIGNED_OUT**: User state clears correctly on sign out
- [ ] **PASSWORD_RECOVERY**: Password recovery redirects properly
- [ ] **USER_UPDATED**: Password updates reflect in user object

#### Network Tab Debugging
Look for these successful requests:
- [ ] **POST** `/auth/v1/recover` - Password reset request
- [ ] **PUT** `/auth/v1/user` - Password update
- [ ] **GET** `/auth/v1/user` - Session validation

## Next Steps

After completing this checklist:

1. **If all tests pass**: Your setup is correctly configured!
2. **If some tests fail**: Check the specific error messages and refer to the troubleshooting section in `password_recovery_supabase_config.md`
3. **For production deployment**: Follow the production deployment notes

## Quick Fix Commands

If you need to restart fresh:

```bash
# Remove existing environment file
rm .env

# Copy from example
cp env.example .env

# Restart development server
npm run dev
# or
yarn dev
# or
bun dev
``` 