#!/bin/bash

# This script sets up the required secrets for the send-invitation-email edge function

echo "Setting up Edge Function secrets for send-invitation-email..."
echo ""
echo "Please ensure you have the Supabase CLI installed and are logged in."
echo ""

# Check if required environment variables are set
if [ -z "$RESEND_API_KEY" ]; then
    echo "Please enter your Resend API key:"
    read -s RESEND_API_KEY
    echo ""
fi

if [ -z "$FROM_EMAIL" ]; then
    echo "Please enter the FROM email address (default: hello@mailvibes.io):"
    read FROM_EMAIL
    FROM_EMAIL=${FROM_EMAIL:-hello@mailvibes.io}
    echo ""
fi

if [ -z "$PUBLIC_APP_URL" ]; then
    echo "Please enter the PUBLIC_APP_URL (default: https://sales-sheet.vercel.app):"
    read PUBLIC_APP_URL
    PUBLIC_APP_URL=${PUBLIC_APP_URL:-https://sales-sheet.vercel.app}
    echo ""
fi

echo "Setting secrets..."

# Set the secrets
supabase secrets set RESEND_API_KEY=$RESEND_API_KEY
supabase secrets set FROM_EMAIL=$FROM_EMAIL
supabase secrets set PUBLIC_APP_URL=$PUBLIC_APP_URL

echo ""
echo "✅ Secrets have been set!"
echo ""
echo "To verify, run: supabase secrets list"
echo ""
echo "Now you need to deploy the edge function with these secrets:"
echo "supabase functions deploy send-invitation-email" 