# Gmail Token Refresh Solution

## Problem

Users were experiencing token expiration after approximately 1 hour, requiring them to reconnect their Gmail accounts repeatedly. This created a poor user experience as the integration was meant to be a one-time setup.

## Root Cause

The frontend was attempting to refresh tokens directly by calling Google's OAuth2 token endpoint, but this requires the `client_secret` which cannot be exposed in frontend code for security reasons.

## Solution Overview

We implemented a secure token refresh mechanism using Supabase Edge Functions that:

1. Automatically refreshes tokens when they're about to expire
2. Handles the refresh process server-side with proper credentials
3. Updates the database with new tokens
4. Provides clear error messages when reconnection is truly needed

## Implementation Details

### 1. New Edge Function: `gmail-refresh-token`

Created a new Edge Function at `supabase/functions/gmail-refresh-token/index.ts` that:

- Accepts user ID and email as parameters
- Retrieves the current refresh token from the database
- Calls Google's OAuth2 token endpoint with client_secret
- Updates the database with the new access token
- Handles errors gracefully and updates account status

### 2. Updated Token Service

Modified `src/services/google/tokenService.ts` to:

- Call the Edge Function instead of Google directly
- Pass authentication headers properly
- Handle refresh failures appropriately

### 3. Database Schema Updates

Added migration `20250123000001_add_token_refresh_tracking.sql` to:

- Track refresh attempts
- Add proper indexes for performance
- Update RLS policies for Edge Functions

## Deployment Instructions

### 1. Deploy Edge Functions

```bash
# Make the deployment script executable (one time only)
chmod +x deploy-edge-functions.sh

# Deploy the functions
./deploy-edge-functions.sh
```

### 2. Set Environment Secrets

In your Supabase project dashboard or via CLI:

```bash
supabase secrets set GOOGLE_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret
```

### 3. Run Database Migrations

```bash
supabase db push
```

## How It Works

### Token Refresh Flow

1. When requesting a token, the system checks if it expires within 5 minutes
2. If expiring soon, it calls the Edge Function to refresh
3. The Edge Function uses the refresh token to get a new access token
4. The new token is saved to the database
5. The fresh token is returned to the caller

### Error Handling

- If refresh fails due to invalid refresh token, the account is marked as needing reconnection
- Failed refresh attempts are tracked to prevent infinite loops
- Clear error messages guide users to reconnect when necessary

## Monitoring and Maintenance

### Check Token Status

Monitor the `email_accounts` table for accounts with:

- `last_sync_status = 'failed'`
- `last_sync_error` containing "Invalid refresh token"

### Common Issues and Solutions

1. **"Invalid refresh token" errors**

   - The user revoked access in their Google account settings
   - Solution: User needs to reconnect their account

2. **Frequent token refreshes**

   - Normal behavior as Google access tokens expire after 1 hour
   - The system handles this automatically

3. **Edge Function errors**
   - Check Supabase function logs
   - Verify environment secrets are set correctly
   - Ensure database migrations have been run

## Security Considerations

1. **Client Secret Protection**: The client secret is only stored in Supabase Edge Functions, never exposed to the frontend
2. **Token Storage**: All tokens are stored encrypted in Supabase
3. **RLS Policies**: Proper row-level security ensures users can only access their own tokens
4. **HTTPS Only**: All token exchanges happen over secure connections

## Testing

To test the token refresh:

1. Connect a Gmail account
2. Wait for the token to expire (or manually update `expires_at` in the database to a past time)
3. Try to import contacts again
4. The system should automatically refresh the token without requiring reconnection

## Future Improvements

1. Implement token refresh scheduling to proactively refresh before expiration
2. Add monitoring alerts for failed refresh attempts
3. Implement retry logic with exponential backoff
4. Add analytics to track token refresh patterns
