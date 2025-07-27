# Gmail Integration Debug Guide

## Pasos para depurar la integración de Gmail

### 1. Verificar en la consola del navegador

Abre las herramientas de desarrollo (F12) y busca estos logs:

```
[GmailConnectDialog] Checking for OAuth callback...
[GmailConnectDialog] Current URL: ...
[GmailConnectDialog] Is OAuth callback? true/false
[GmailConnectDialog] User: ...
```

### 2. Verificar el flujo OAuth

1. Haz clic en "Connect Gmail Account"
2. Deberías ser redirigido a Google
3. Después de autorizar, Google te redirige de vuelta a tu app
4. La URL debería contener `?code=...&state=...`

### 3. Verificar el botón "Check Status"

En la página de Integrations, haz clic en "Check Status" y revisa:

- La consola del navegador para ver los logs
- El toast que aparece con el conteo de cuentas y tokens

### 4. Verificar directamente en Supabase

Ve a tu dashboard de Supabase:

1. https://app.supabase.com/project/nihnthenxxbkvoisatop/editor
2. Ejecuta estas consultas:

```sql
-- Ver todas las cuentas de email
SELECT * FROM email_accounts;

-- Ver todos los tokens OAuth
SELECT * FROM oauth_tokens;

-- Ver logs de sincronización
SELECT * FROM email_sync_log ORDER BY created_at DESC LIMIT 10;
```

### 5. Problemas comunes

#### La tabla email_accounts está vacía

- El Edge Function no está guardando los datos
- Hay un error de permisos en la base de datos
- El usuario no está autenticado correctamente

#### Error "The OAuth client was not found"

- Las credenciales de Google no están configuradas
- El tipo de cliente OAuth es incorrecto (debe ser "Web application")

#### No se redirige después de autorizar en Google

- Verifica que el redirect URI esté configurado correctamente en Google Cloud Console
- Debe ser exactamente: `http://localhost:3000/integrations`

### 6. Logs del Edge Function

Para ver qué está pasando en el Edge Function:

1. Ve al dashboard de Supabase
2. Functions → gmail-oauth-callback → Logs

### 7. Verificar las variables de entorno

En el Edge Function, las credenciales están temporalmente hardcodeadas:

- Client ID: `209650116169-r6i7l8d82t5o30qnr1rovsfra5ft94mj.apps.googleusercontent.com`
- Client Secret: `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`

### 8. Probar el Edge Function directamente

```bash
curl -X POST https://nihnthenxxbkvoisatop.supabase.co/functions/v1/gmail-oauth-callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "code": "test",
    "code_verifier": "test",
    "redirect_uri": "http://localhost:3000/integrations",
    "user_id": "YOUR_USER_ID"
  }'
```

Esto debería devolver un error de Google, pero confirma que el Edge Function está funcionando.
