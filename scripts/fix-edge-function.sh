#!/bin/bash

# This script fixes the edge function configuration for the invitation emails

echo "Fixing Edge Function configuration for invitation emails..."

# Set the required secrets
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
supabase secrets set FROM_EMAIL=noreply@sales-sheet.vercel.app
supabase secrets set PUBLIC_APP_URL=https://sales-sheet.vercel.app

# Deploy the updated edge function
supabase functions deploy send-invitation-email

echo "✅ Edge Function updated!"
echo "Note: You'll need to add noreply@sales-sheet.vercel.app as a sender in Resend"
echo "Visit https://resend.com/domains to set this up" 