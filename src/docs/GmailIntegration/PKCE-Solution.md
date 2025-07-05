# Gmail OAuth2 PKCE Solution for SPAs

## 🚨 El Problema

Estás recibiendo estos errores:

1. **"Token exchange failed: client_secret is missing"** - Google OAuth2 requiere un `client_secret` para intercambiar el código por tokens
2. **"Invalid state parameter - possible CSRF attack"** - El state parameter no se está validando correctamente
3. **Múltiples ejecuciones del callback** - El callback se está ejecutando varias veces

## 🔧 La Solución

Para aplicaciones SPA (Single Page Applications) sin backend, tenemos dos opciones:

### Opción 1: Usar Supabase Edge Functions (RECOMENDADO)

1. Crear una Edge Function en Supabase para manejar el intercambio de tokens
2. Guardar el `client_secret` de forma segura en las variables de entorno de Supabase
3. El frontend llama a la Edge Function en lugar de hacer el intercambio directamente

### Opción 2: Cambiar a flujo implícito (MENOS SEGURO)

1. Cambiar `response_type` de "code" a "token"
2. No se requiere `client_secret`
3. Menos seguro porque el token se expone en la URL

## 📝 Implementación con Supabase Edge Functions

### 1. Crear Edge Function

```bash
supabase functions new gmail-oauth-callback
```

### 2. Código de la Edge Function

```typescript
// supabase/functions/gmail-oauth-callback/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { code, code_verifier } = await req.json();

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        code,
        code_verifier,
        grant_type: "authorization_code",
        redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI")!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const userInfo = await userResponse.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save tokens to database
    const { data: emailAccount, error: accountError } = await supabase
      .from("email_accounts")
      .upsert({
        user_id: req.headers.get("x-user-id"),
        email: userInfo.email,
        provider: "gmail",
        sync_enabled: true,
      })
      .select()
      .single();

    if (accountError) throw accountError;

    const { error: tokenError } = await supabase.from("oauth_tokens").upsert({
      user_id: req.headers.get("x-user-id"),
      email_account_id: emailAccount.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });

    if (tokenError) throw tokenError;

    return new Response(
      JSON.stringify({
        success: true,
        email: userInfo.email,
        account_id: emailAccount.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
```

### 3. Desplegar la función

```bash
supabase functions deploy gmail-oauth-callback
```

### 4. Configurar variables de entorno en Supabase

```bash
supabase secrets set GOOGLE_CLIENT_ID=your-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-client-secret
supabase secrets set GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## 🔄 Actualizar el Frontend

Modificar `authService.ts` para usar la Edge Function:

```typescript
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  try {
    const pkceParams = retrievePKCEParams();
    if (!pkceParams) {
      throw new Error("PKCE parameters not found or expired");
    }

    // Call Supabase Edge Function instead of Google directly
    const { data, error } = await supabase.functions.invoke(
      "gmail-oauth-callback",
      {
        body: {
          code,
          code_verifier: pkceParams.code_verifier,
        },
        headers: {
          "x-user-id": supabase.auth.getUser().then((u) => u.data.user?.id),
        },
      }
    );

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    throw error;
  }
}
```

## ✅ Beneficios

1. **Seguridad**: El `client_secret` nunca se expone en el frontend
2. **PKCE**: Mantiene la seguridad adicional de PKCE
3. **Centralizado**: Toda la lógica de tokens en un solo lugar
4. **Escalable**: Fácil de mantener y actualizar

## 🚀 Próximos Pasos

1. Implementar la Edge Function
2. Actualizar el frontend para usar la función
3. Probar el flujo completo
4. Implementar refresh token automático
