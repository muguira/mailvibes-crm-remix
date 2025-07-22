#!/bin/bash

# Test the Edge Function locally
curl -X POST https://nihnthenxxbkvoisatop.supabase.co/functions/v1/send-invitation-email \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "organizationName": "SalesSheet.ai",
    "inviterName": "Andres Rodriguez",
    "inviterEmail": "andres@salessheet.io",
    "role": "user",
    "invitationToken": "test-token-123",
    "personalMessage": "Welcome to our team!",
    "expiresAt": "2024-08-01T00:00:00.000Z"
  }' 