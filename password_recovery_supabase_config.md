# Password Recovery Supabase Configuration Guide

## Overview
This guide explains how to configure Supabase to properly handle password recovery emails and redirects for your SalesSheet CRM application.

## 1. Current Supabase Dashboard Configuration

Based on your current setup, verify these configurations match:

### Step 1: URL Configuration
In **Supabase Dashboard** → **Authentication** → **URL Configuration**:

#### Site URL
```
https://app.salessheet.ai
```
*For development: `http://localhost:3000`*

#### Redirect URLs (Current Configuration)
Your current setup includes:
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

### Step 2: Email Templates Configuration

#### Navigate to Email Templates
1. Go to **Authentication** → **Email Templates**
2. Update templates as needed:

#### Confirm Signup Template
**Subject:** `Confirm Your Signup`
**Redirect URL:**
```
{{ .SiteURL }}/auth?access_token={{ .TokenHash }}&type=signup
```

#### Invite User Template  
**Subject:** `You have been invited` ✅ (Currently correct)
**Redirect URL:**
```
{{ .SiteURL }}/accept-invitation?access_token={{ .TokenHash }}&type=invite
```

#### Reset Password Template
**Subject:** `Reset your password for SalesSheet AI CRM` ✅ (Currently correct)

**HTML Template:**
```html
<h2>Reset your password</h2>
<p>Hi there,</p>
<p>Someone requested a password reset for your SalesSheet AI CRM account.</p>
<p>If this was you, click the button below to reset your password:</p>
<p><a href="{{ .SiteURL }}/auth/reset-password?access_token={{ .TokenHash }}&refresh_token={{ .RefreshToken }}&type=recovery" style="display: inline-block; padding: 12px 24px; background-color: #00A991; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a></p>
<p>If you didn't request this password reset, you can safely ignore this email.</p>
<p>This link will expire in 1 hour for security reasons.</p>
<p>Thanks,<br>The SalesSheet AI CRM Team</p>
```

**Text Template:**
```
Reset your password

Hi there,

Someone requested a password reset for your SalesSheet AI CRM account.

If this was you, copy and paste this link into your browser to reset your password:
{{ .SiteURL }}/auth/reset-password?access_token={{ .TokenHash }}&refresh_token={{ .RefreshToken }}&type=recovery

If you didn't request this password reset, you can safely ignore this email.

This link will expire in 1 hour for security reasons.

Thanks,
The SalesSheet AI CRM Team
```

## 2. Environment Variables

Ensure your `.env` file contains (now properly configured):
```env
VITE_SUPABASE_URL=https://nihnthenxxbkvoisatop.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paG50aGVueHhia3ZvaXNhdG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNjY2MDQsImV4cCI6MjA2MTc0MjYwNH0.wjkBOFFcmPbwdTDJVbZzcOWhFYwfuFjRBhg00sWoYxk
```

## 3. Testing the Password Recovery Flow

### Test Steps:
1. **Request Password Reset:**
   - Go to `/auth/forgot-password`
   - Enter your email address
   - Check that you see the "Check Your Email" confirmation

2. **Check Email:**
   - Look for the password reset email with subject "Reset your password for SalesSheet AI CRM"
   - Verify the email contains the correct reset link
   - The link should point to `/auth/reset-password` with proper tokens

3. **Reset Password:**
   - Click the email link
   - Verify you land on the password reset page
   - Enter and confirm a new password
   - Check that validation works (7+ chars, uppercase, lowercase, number)
   - Submit the form and verify success

4. **Sign In with New Password:**
   - After successful reset, click "Continue to Sign In"
   - Use your new password to sign in
   - Verify you can access the application

## 4. Current Authentication Flow Features

✅ **Auto Session Detection:** Supabase client configured with `detectSessionInUrl: true`
✅ **PKCE Flow:** Secure authentication with `flowType: 'pkce'`
✅ **Password Recovery Handler:** Automatic redirect of recovery URLs to reset page
✅ **Strong Password Validation:** 7+ characters, mixed case, numbers required
✅ **Comprehensive Error Handling:** User-friendly error messages and loading states
✅ **Route Protection:** Proper authentication guards on protected routes

## 5. Troubleshooting

### Common Issues:

**Issue:** Password reset email not received
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email logs in dashboard

**Issue:** Reset link shows "Invalid Reset Link"
- Link may have expired (1 hour limit)
- Check that URL parameters are complete (access_token, type=recovery)
- Verify redirect URLs are configured in Supabase dashboard

**Issue:** Password update fails
- Check password meets requirements (7+ chars, uppercase, lowercase, number)
- Verify user session is properly set
- Check browser console for errors

**Issue:** Environment variables not loading
- Ensure `.env` file exists in project root
- Restart development server after updating environment variables
- Verify environment variable names match exactly (case-sensitive)

## 6. Security Features Implemented

- **Token Validation:** Verifies access and refresh tokens from email link
- **Session Management:** Automatically sets session for password reset
- **Password Requirements:** Enforces strong password policies
- **Real-time Validation:** Shows password requirements as you type
- **Expiry Handling:** Gracefully handles expired reset links
- **Error Handling:** Displays helpful error messages
- **Visual Feedback:** Shows loading states and success confirmations
- **CSRF Protection:** Supabase's built-in PKCE flow security

## 7. Production Deployment Notes

When deploying to production:

1. **Update Site URL:** Ensure production domain is set as Site URL
2. **Update Redirect URLs:** Verify all production URLs are in allowlist
3. **SSL Required:** Ensure HTTPS is enabled for all auth flows
4. **Email Deliverability:** Monitor email delivery rates
5. **Rate Limiting:** Monitor for abuse of password reset requests
6. **Environment Variables:** Use secure environment variable management

## 8. Code Integration Points

The password recovery system integrates with these key components:

- **`ForgotPassword.tsx`**: Handles password reset requests
- **`ResetPassword.tsx`**: Processes password reset with token validation
- **`PasswordRecoveryHandler.tsx`**: Automatically redirects recovery URLs
- **`useAuthSlice.ts`**: Zustand store managing auth state
- **`App.tsx`**: Route configuration for auth flows
- **`client.ts`**: Supabase client with proper auth configuration 