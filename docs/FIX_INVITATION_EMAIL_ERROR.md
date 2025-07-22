# Fix for Invitation Email Error (400 Bad Request)

## Problem
When trying to send invitation emails in production, you're getting a 400 Bad Request error from the Edge Function.

## Root Cause
The Edge Function is missing required environment variables (secrets) in your Supabase project.

## Solution

### Step 1: Set Edge Function Secrets

You need to set the following secrets in your Supabase project:

1. **Via Supabase Dashboard (Recommended)**:
   - Go to your Supabase Dashboard
   - Navigate to Edge Functions → Secrets
   - Add these secrets:
     ```
     RESEND_API_KEY=your_resend_api_key_here
     FROM_EMAIL=hello@mailvibes.io
     PUBLIC_APP_URL=https://sales-sheet.vercel.app
     ```

2. **Via Supabase CLI**:
   ```bash
   # Login to Supabase CLI
   supabase login
   
   # Link to your project
   supabase link --project-ref nihnthenxxbkvoisatop
   
   # Set secrets
   supabase secrets set RESEND_API_KEY=your_resend_api_key_here
   supabase secrets set FROM_EMAIL=hello@mailvibes.io
   supabase secrets set PUBLIC_APP_URL=https://sales-sheet.vercel.app
   ```

### Step 2: Deploy the Edge Function

After setting the secrets, redeploy the edge function:

```bash
supabase functions deploy send-invitation-email
```

### Step 3: Verify Deployment

Check that the function is deployed correctly:
```bash
supabase functions list
```

### Step 4: Test the Function

You can test the function directly:
```bash
supabase functions invoke send-invitation-email --body '{
  "to": "test@example.com",
  "organizationName": "Test Org",
  "inviterName": "Test User",
  "inviterEmail": "inviter@example.com",
  "role": "user",
  "invitationToken": "test-token",
  "expiresAt": "2024-12-31T23:59:59Z"
}'
```

## Getting a Resend API Key

1. Sign up at [Resend.com](https://resend.com)
2. Go to API Keys section
3. Create a new API key
4. Copy the key and use it in the setup above

## Verifying Email Domain

For production use, you should verify your domain in Resend:
1. Go to Domains in Resend dashboard
2. Add your domain (e.g., mailvibes.io)
3. Follow the DNS verification steps
4. Once verified, update `FROM_EMAIL` to use your domain

## Temporary Workaround

While you set up the Edge Function, invitations will still be created in the database. Users can:
1. Check the `organization_invitations` table for the invitation token
2. Manually construct the acceptance URL: `https://sales-sheet.vercel.app/accept-invitation?token=INVITATION_TOKEN`
3. Share this URL with the invited user

## Debugging

If the error persists after setup:
1. Check Edge Function logs in Supabase Dashboard
2. Verify all secrets are set: `supabase secrets list`
3. Ensure Resend API key is valid and has sufficient credits
4. Check that the FROM_EMAIL domain is verified in Resend

## Additional Notes

- The Edge Function handles CORS automatically
- Email templates are included in the function
- The function returns a 400 status for any errors to help with debugging
- In development, the app will fall back to console logging when emails fail 