import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      throw new Error("Missing user_id or email");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the current token record
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from("oauth_tokens")
      .select(
        `
        *,
        email_accounts!inner(email, user_id)
      `
      )
      .eq("email_accounts.user_id", user_id)
      .eq("email_accounts.email", email)
      .single();

    if (tokenError || !tokenRecord) {
      console.error("Token not found:", tokenError);
      throw new Error("Token not found");
    }

    if (!tokenRecord.refresh_token) {
      throw new Error("No refresh token available");
    }

    // Refresh the token with Google
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: tokenRecord.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshResponse.json();

    if (!refreshResponse.ok) {
      console.error("Token refresh failed:", refreshData);

      // If refresh token is invalid, update the account status
      if (refreshResponse.status === 400) {
        await supabaseAdmin
          .from("email_accounts")
          .update({
            last_sync_status: "failed",
            last_sync_error:
              "Invalid refresh token. Please reconnect your Gmail account.",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user_id)
          .eq("email", email);
      }

      throw new Error(
        refreshData.error_description || "Failed to refresh token"
      );
    }

    // Update the token in database
    const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);

    const { error: updateError } = await supabaseAdmin
      .from("oauth_tokens")
      .update({
        access_token: refreshData.access_token,
        // If Google provides a new refresh token, update it
        refresh_token: refreshData.refresh_token || tokenRecord.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenRecord.id);

    if (updateError) {
      console.error("Failed to update token:", updateError);
      throw new Error("Failed to update refreshed token");
    }

    // Clear any error status on the email account
    await supabaseAdmin
      .from("email_accounts")
      .update({
        last_sync_status: "success",
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .eq("email", email);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: refreshData.access_token,
        expires_at: newExpiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in gmail-refresh-token:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
