# Variables de Entorno para Gmail Integration

## 📋 Instrucciones

1. **Copia estas variables a tu archivo `.env.local`**
2. **Reemplaza los valores de ejemplo con tus credenciales reales de Google**
3. **Mantén tus credenciales de Supabase existentes**

---

## 🔧 Variables Necesarias

### Google OAuth2 Configuration

```bash
# Client ID from Google Cloud Console -> APIs & Services -> Credentials
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Redirect URI configured in Google Cloud Console
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# OAuth2 scopes needed for Gmail and Contacts
VITE_GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile
```

### Gmail API Configuration

```bash
# Gmail API base URL
VITE_GMAIL_API_BASE_URL=https://gmail.googleapis.com/gmail/v1

# Google People API base URL (for contacts)
VITE_GOOGLE_PEOPLE_API_BASE_URL=https://people.googleapis.com/v1

# Maximum emails to fetch in one request
VITE_GMAIL_MAX_RESULTS=50

# Sync interval in milliseconds (5 minutes = 300000ms)
VITE_GMAIL_SYNC_INTERVAL_MS=300000

# Email cache TTL in milliseconds (15 minutes = 900000ms)
VITE_GMAIL_CACHE_TTL_MS=900000
```

### Feature Flags

```bash
# Enable Gmail integration features
VITE_ENABLE_GMAIL_INTEGRATION=true

# Enable contact import from Gmail
VITE_ENABLE_GMAIL_CONTACT_IMPORT=true

# Enable email timeline in contact views
VITE_ENABLE_EMAIL_TIMELINE=true

# Enable email composer (for later phases)
VITE_ENABLE_EMAIL_COMPOSER=false

# Enable real-time email sync
VITE_ENABLE_REALTIME_EMAIL_SYNC=false
```

### Development Settings

```bash
# Enable debug logging for Gmail integration
VITE_GMAIL_DEBUG=true

# Enable OAuth debug logging
VITE_OAUTH_DEBUG=true

# Environment
VITE_NODE_ENV=development
```

### Performance Settings

```bash
# Number of contacts to import in one batch
VITE_GMAIL_CONTACT_BATCH_SIZE=100

# Number of emails to sync in one batch
VITE_GMAIL_EMAIL_BATCH_SIZE=50

# Maximum number of parallel API requests
VITE_GMAIL_MAX_CONCURRENT_REQUESTS=3

# Request timeout in milliseconds
VITE_GMAIL_REQUEST_TIMEOUT_MS=30000
```

---

## 🚨 Variables Críticas que DEBES Cambiar

### 1. VITE_GOOGLE_CLIENT_ID

**Dónde conseguirlo:**

- Google Cloud Console → APIs & Services → Credentials
- Busca tu "OAuth 2.0 Client ID"
- Copia el valor que termina en `.apps.googleusercontent.com`

**Ejemplo:**

```bash
VITE_GOOGLE_CLIENT_ID=123456789-abcdef123456.apps.googleusercontent.com
```

### 2. VITE_GOOGLE_REDIRECT_URI

**Configuración:**

- Debe coincidir EXACTAMENTE con lo configurado en Google Cloud Console
- Para desarrollo local: `http://localhost:5173/auth/google/callback`
- Para producción: `https://tudominio.com/auth/google/callback`

---

## 📝 Paso a Paso

### 1. Abrir tu archivo `.env.local`

```bash
# Si no existe, créalo en la raíz del proyecto
touch .env.local
```

### 2. Mantener tus variables existentes

```bash
# Mantén estas variables que ya deberías tener
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

### 3. Agregar las nuevas variables

Copia y pega todas las variables de arriba, reemplazando los valores de ejemplo.

### 4. Verificar configuración

Crear este archivo temporal para verificar:

```typescript
// src/utils/checkGmailEnv.ts
export function checkGmailEnvVariables() {
  console.log("🔧 Gmail Environment Variables Check:");
  console.log("Google Client ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
  console.log(
    "Gmail Integration Enabled:",
    import.meta.env.VITE_ENABLE_GMAIL_INTEGRATION
  );
  console.log("Redirect URI:", import.meta.env.VITE_GOOGLE_REDIRECT_URI);
  console.log("Gmail API URL:", import.meta.env.VITE_GMAIL_API_BASE_URL);

  // Verificar variables críticas
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    console.error("❌ VITE_GOOGLE_CLIENT_ID is missing!");
  }
  if (!import.meta.env.VITE_GOOGLE_REDIRECT_URI) {
    console.error("❌ VITE_GOOGLE_REDIRECT_URI is missing!");
  }

  console.log("✅ Environment check complete");
}
```

---

## 🔐 Seguridad

- ❌ **NO** incluyas `GOOGLE_CLIENT_SECRET` en variables que empiecen con `VITE_`
- ✅ **SÍ** usa solo el Client ID en el frontend
- ✅ **SÍ** usa el flujo PKCE (sin client secret)
- ✅ **SÍ** mantén `.env.local` en `.gitignore`

---

## 📦 Archivo Completo de Ejemplo

```bash
# ==================================================
# SUPABASE CONFIGURATION (mantén tus valores existentes)
# ==================================================
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima

# ==================================================
# GOOGLE OAUTH2 CONFIGURATION
# ==================================================
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
VITE_GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile

# ==================================================
# GMAIL API CONFIGURATION
# ==================================================
VITE_GMAIL_API_BASE_URL=https://gmail.googleapis.com/gmail/v1
VITE_GOOGLE_PEOPLE_API_BASE_URL=https://people.googleapis.com/v1
VITE_GMAIL_MAX_RESULTS=50
VITE_GMAIL_SYNC_INTERVAL_MS=300000
VITE_GMAIL_CACHE_TTL_MS=900000

# ==================================================
# FEATURE FLAGS
# ==================================================
VITE_ENABLE_GMAIL_INTEGRATION=true
VITE_ENABLE_GMAIL_CONTACT_IMPORT=true
VITE_ENABLE_EMAIL_TIMELINE=true
VITE_ENABLE_EMAIL_COMPOSER=false
VITE_ENABLE_REALTIME_EMAIL_SYNC=false

# ==================================================
# DEVELOPMENT SETTINGS
# ==================================================
VITE_GMAIL_DEBUG=true
VITE_OAUTH_DEBUG=true
VITE_NODE_ENV=development

# ==================================================
# PERFORMANCE SETTINGS
# ==================================================
VITE_GMAIL_CONTACT_BATCH_SIZE=100
VITE_GMAIL_EMAIL_BATCH_SIZE=50
VITE_GMAIL_MAX_CONCURRENT_REQUESTS=3
VITE_GMAIL_REQUEST_TIMEOUT_MS=30000
```
