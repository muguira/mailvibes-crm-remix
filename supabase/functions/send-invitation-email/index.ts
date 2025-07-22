import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, organizationName, inviterName, inviterEmail, role, invitationToken, personalMessage, expiresAt } =
      await req.json()

    // Get environment variables
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'hello@salessheet.ai'
    const APP_URL = Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:3000'

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    // Generate accept URL
    const acceptUrl = `${APP_URL}/accept-invitation?token=${invitationToken}`

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #00A991; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #00A991; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're invited to join ${organizationName}</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.</p>
              ${personalMessage ? `<p><em>"${personalMessage}"</em></p>` : ''}
              <p>Click the button below to accept this invitation:</p>
              <div style="text-align: center;">
                <a href="${acceptUrl}" class="button">Accept Invitation</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #0066cc;">${acceptUrl}</p>
              <p><small>This invitation will expire on ${new Date(expiresAt).toLocaleDateString()}.</small></p>
            </div>
            <div class="footer">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              <p>&copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: `${inviterName} invited you to join ${organizationName}`,
        html: emailHtml,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Resend API error: ${error}`)
    }

    const result = await response.json()
    console.log('Email sent successfully:', result)

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
        message: 'Invitation email sent successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
