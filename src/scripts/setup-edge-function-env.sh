#!/bin/bash

# This script helps set up environment variables for the send-invitation-email Edge Function

echo "Setting up Edge Function environment variables..."

# Check if the user has provided the required environment variables
if [ -z "$1" ]; then
    echo "Usage: ./setup-edge-function-env.sh <RESEND_API_KEY>"
    echo "Example: ./setup-edge-function-env.sh re_123456789"
    exit 1
fi

RESEND_API_KEY=$1

# Set the environment variables in Supabase
echo "Setting RESEND_API_KEY..."
supabase secrets set RESEND_API_KEY=$RESEND_API_KEY

echo "Setting FROM_EMAIL..."
supabase secrets set FROM_EMAIL=hello@salessheet.io

echo "Setting PUBLIC_APP_URL..."
supabase secrets set PUBLIC_APP_URL=http://localhost:3000

# List all secrets to confirm
echo ""
echo "Current secrets:"
supabase secrets list

echo ""
echo "✅ Edge Function environment variables set successfully!"
echo ""
echo "Note: You may need to wait a few seconds for the secrets to propagate."
echo "If emails still fail, check the Edge Function logs in your Supabase dashboard." 