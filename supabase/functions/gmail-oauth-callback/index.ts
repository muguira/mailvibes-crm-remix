// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Gmail OAuth Callback Function started!')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const { code, code_verifier, redirect_uri, user_id } = await req.json()

    if (!code || !code_verifier || !redirect_uri || !user_id) {
      throw new Error('Missing required parameters')
    }

    // Get environment variables
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    console.log('[Debug] Environment check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    })

    if (!clientId || !clientSecret) {
      console.error('[Error] Missing Google OAuth credentials in environment')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google OAuth credentials not configured in environment',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier,
        grant_type: 'authorization_code',
        redirect_uri,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      throw new Error(tokenData.error_description || 'Failed to exchange code for tokens')
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to get user info')
    }

    const userInfo = await userResponse.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Create or update email account
    const { data: emailAccount, error: accountError } = await supabaseAdmin
      .from('email_accounts')
      .upsert(
        {
          user_id,
          email: userInfo.email,
          provider: 'gmail',
          sync_enabled: true,
          settings: {
            name: userInfo.name,
            picture: userInfo.picture,
          },
        },
        {
          onConflict: 'user_id,email',
        },
      )
      .select()
      .single()

    if (accountError) {
      console.error('Error creating email account:', accountError)
      throw accountError
    }

    // Store OAuth tokens
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    const { error: tokenError } = await supabaseAdmin.from('oauth_tokens').upsert(
      {
        user_id,
        email_account_id: emailAccount.id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt.toISOString(),
      },
      {
        onConflict: 'email_account_id',
      },
    )

    if (tokenError) {
      console.error('Error storing tokens:', tokenError)
      throw tokenError
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
          token_type: tokenData.token_type,
          email: userInfo.email,
          user_info: userInfo,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Edge function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gmail-oauth-callback' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
