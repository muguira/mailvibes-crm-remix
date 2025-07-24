# Password Recovery Supabase Configuration Guide

## Overview
This guide explains how to configure Supabase to properly handle password recovery emails and redirects for your SalesSheet CRM application.

## 1. Supabase Dashboard Configuration

### Step 1: Update Auth Settings
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Settings** → **Auth Settings**
3. Update the following URLs:

#### Site URL
```
http://localhost:3000
```
*For production: `https://your-domain.com`*

#### Additional Redirect URLs
Add these URLs to allow password reset redirects:
```
http://localhost:3000/auth/reset-password
http://localhost:3000/auth/forgot-password
```
*For production, also add: `https://your-domain.com/auth/reset-password`*

### Step 2: Configure Email Templates

#### Navigate to Email Templates
1. Go to **Authentication** → **Email Templates**
2. Select **"Reset Password"** template

#### Update the Reset Password Email Template

**Subject:**
```
Reset your password for SalesSheet CRM
```

**HTML Template:**
```html
<h2>Reset your password</h2>
<p>Hi there,</p>
<p>Someone requested a password reset for your SalesSheet CRM account.</p>
<p>If this was you, click the button below to reset your password:</p>
<p><a href="{{ .SiteURL }}/auth/reset-password?access_token={{ .TokenHash }}&refresh_token={{ .RefreshToken }}&type=recovery" style="display: inline-block; padding: 12px 24px; background-color: #00A991; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a></p>
<p>If you didn't request this password reset, you can safely ignore this email.</p>
<p>This link will expire in 1 hour for security reasons.</p>
<p>Thanks,<br>The SalesSheet CRM Team</p>
```

**Text Template:**
```
Reset your password

Hi there,

Someone requested a password reset for your SalesSheet CRM account.

If this was you, copy and paste this link into your browser to reset your password:
{{ .SiteURL }}/auth/reset-password?access_token={{ .TokenHash }}&refresh_token={{ .RefreshToken }}&type=recovery

If you didn't request this password reset, you can safely ignore this email.

This link will expire in 1 hour for security reasons.

Thanks,
The SalesSheet CRM Team
```

## 2. Environment Variables

Ensure your `.env` file contains:
```env
VITE_SUPABASE_URL=https://nihnthenxxbkvoisatop.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 3. Testing the Password Recovery Flow

### Test Steps:
1. **Request Password Reset:**
   - Go to `/auth/login`
   - Click "Forgot your password?"
   - Enter your email address
   - Check that you see the "Check Your Email" confirmation

2. **Check Email:**
   - Look for the password reset email
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

## 4. Security Features Implemented

✅ **Token Validation:** Verifies access and refresh tokens from email link
✅ **Session Management:** Automatically sets session for password reset
✅ **Password Requirements:** Enforces strong password policies
✅ **Real-time Validation:** Shows password requirements as you type
✅ **Expiry Handling:** Gracefully handles expired reset links
✅ **Error Handling:** Displays helpful error messages
✅ **Visual Feedback:** Shows loading states and success confirmations

## 5. Troubleshooting

### Common Issues:

**Issue:** Password reset email not received
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email logs in dashboard

**Issue:** Reset link shows "Invalid Reset Link"
- Link may have expired (1 hour limit)
- Check that URL parameters are complete
- Verify redirect URLs are configured in Supabase

**Issue:** Password update fails
- Check password meets requirements
- Verify user session is properly set
- Check browser console for errors

**Issue:** Redirect after password change doesn't work
- Verify Site URL is configured correctly
- Check that auth flow completes properly

## 6. Production Deployment Notes

When deploying to production:

1. **Update Site URL:** Change to your production domain
2. **Update Redirect URLs:** Add production URLs to the allowlist
3. **SSL Required:** Ensure HTTPS is enabled for all auth flows
4. **Email Deliverability:** Consider using a custom email service
5. **Rate Limiting:** Monitor for abuse of password reset requests

## 7. Additional Security Considerations

- Password reset links expire after 1 hour
- Only one reset link is valid at a time per user
- Failed attempts are logged
- User sessions are properly managed
- CSRF protection through Supabase's built-in security 