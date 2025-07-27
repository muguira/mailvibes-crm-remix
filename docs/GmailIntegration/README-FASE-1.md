# 📋 FASE 1: PREPARACIÓN E INFRAESTRUCTURA - Integración Gmail

## 📌 Resumen

Esta fase establece las bases para la integración con Gmail, incluyendo la configuración en Google Cloud Console y el diseño de la base de datos en Supabase.

**Estado**: ✅ COMPLETADA (Enero 7, 2025)  
**Duración real**: 2 días  
**Prioridad**: Alta - Bloquea todas las demás fases

## 📑 Tabla de Contenidos

1. [Tarea 1.1: Configuración del Proyecto en Google Cloud Console](#tarea-11-configuración-del-proyecto-en-google-cloud-console)
2. [Tarea 1.2: Diseño de Base de Datos para Emails](#tarea-12-diseño-de-base-de-datos-para-emails)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Testing y Validación](#testing-y-validación)

---

## 🎯 Tarea 1.1: Configuración del Proyecto en Google Cloud Console

### Objetivo

Configurar correctamente el proyecto en Google Cloud Platform para habilitar Gmail API y crear las credenciales OAuth2 necesarias.

### Pre-requisitos

- Cuenta de Google con acceso a Google Cloud Console
- Proyecto de Google Cloud activo (o crear uno nuevo)

### Pasos Detallados

#### 1. Crear/Seleccionar Proyecto en Google Cloud Console

1. Navegar a [Google Cloud Console](https://console.cloud.google.com)
2. Click en el selector de proyectos (arriba a la izquierda)
3. Click en "Nuevo Proyecto"
4. Configurar:
   - **Nombre del proyecto**: `salessheet-crm-gmail`
   - **ID del proyecto**: Se genera automáticamente
   - **Organización**: (si aplica)
5. Click en "Crear"

#### 2. Habilitar Gmail API

1. En el menú lateral, ir a **APIs y servicios** → **Biblioteca**
2. Buscar "Gmail API"
3. Click en "Gmail API" en los resultados
4. Click en el botón **"Habilitar"**
5. Esperar a que se complete la habilitación

#### 3. Habilitar Google People API (para contactos)

1. Volver a la biblioteca de APIs
2. Buscar "People API"
3. Click en "People API"
4. Click en **"Habilitar"**

#### 4. Configurar Pantalla de Consentimiento OAuth

1. Ir a **APIs y servicios** → **Pantalla de consentimiento OAuth**
2. Seleccionar tipo de usuario:
   - **Interno**: Si es para uso dentro de tu organización
   - **Externo**: Para usuarios fuera de tu organización (recomendado para desarrollo)
3. Click en "Crear"
4. Completar información de la aplicación:
   ```
   Nombre de la aplicación: Mailvibes CRM
   Correo electrónico de asistencia: tu-email@ejemplo.com
   Logo de la aplicación: (opcional, subir logo de Mailvibes)
   ```
5. Dominios autorizados:
   ```
   localhost (para desarrollo)
   tu-dominio-produccion.com
   ```
6. Información de contacto del desarrollador:
   ```
   tu-email@ejemplo.com
   ```
7. Click en "Guardar y continuar"

#### 5. Configurar Scopes (Permisos)

1. En la sección de Scopes, click en **"Agregar o quitar scopes"**
2. Buscar y seleccionar los siguientes scopes:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/gmail.compose
   https://www.googleapis.com/auth/contacts.readonly
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```
3. Click en "Actualizar"
4. Click en "Guardar y continuar"

#### 6. Agregar Usuarios de Prueba (si es Externo)

1. Click en "Agregar usuarios"
2. Agregar los emails que podrán probar la app durante desarrollo:
   ```
   tu-email@gmail.com
   email-tester-1@gmail.com
   email-tester-2@gmail.com
   ```
3. Click en "Guardar y continuar"

#### 7. Crear Credenciales OAuth2

1. Ir a **APIs y servicios** → **Credenciales**
2. Click en **"+ Crear credenciales"** → **"ID de cliente OAuth"**
3. Tipo de aplicación: **"Aplicación web"**
4. Configurar:

   ```
   Nombre: Mailvibes CRM Web Client

   Orígenes de JavaScript autorizados:
   - http://localhost:3000
   - http://localhost:5173
   - https://tu-dominio-produccion.com

   URIs de redireccionamiento autorizados:
   - http://localhost:3000/auth/google/callback
   - http://localhost:5173/auth/google/callback
   - https://tu-dominio-produccion.com/auth/google/callback
   ```

5. Click en "Crear"
6. **IMPORTANTE**: Guardar las credenciales mostradas:
   ```
   Client ID: xxx.apps.googleusercontent.com
   Client Secret: GOCSPX-xxxxx
   ```

### Notas Importantes para SPA sin Backend

Para implementar OAuth2 en una SPA sin backend tradicional, usaremos el flujo **PKCE (Proof Key for Code Exchange)**:

1. **NO incluir el Client Secret en el frontend**
2. Usar Supabase Edge Functions para el intercambio seguro
3. Configurar CORS correctamente en Google Cloud

---

## 🎯 Tarea 1.2: Diseño de Base de Datos para Emails

### Objetivo

Crear las tablas necesarias en Supabase para almacenar la información de emails, cuentas conectadas y tokens OAuth.

### Pasos Detallados

#### 1. Crear archivo de migración

Crear el archivo `supabase/migrations/[timestamp]_create_gmail_integration_tables.sql`:

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: email_accounts
-- Stores connected Gmail accounts for each user
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  provider VARCHAR(50) DEFAULT 'gmail' CHECK (provider IN ('gmail', 'outlook', 'other')),
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_minutes INTEGER DEFAULT 5,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(50) DEFAULT 'pending',
  last_sync_error TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Table: oauth_tokens
-- Stores OAuth tokens securely (encrypted at rest by Supabase)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE NOT NULL,
  access_token TEXT NOT NULL, -- Will be encrypted by Supabase
  refresh_token TEXT, -- Will be encrypted by Supabase
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email_account_id)
);

-- Table: emails
-- Stores email metadata and content
CREATE TABLE IF NOT EXISTS public.emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,

  -- Gmail specific fields
  gmail_id VARCHAR(255) UNIQUE NOT NULL,
  gmail_thread_id VARCHAR(255),
  gmail_history_id BIGINT,

  -- Email metadata
  subject TEXT,
  snippet TEXT, -- First 100-200 chars of email
  body_text TEXT,
  body_html TEXT,

  -- Sender/Recipient info
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_emails JSONB DEFAULT '[]', -- Array of {email, name}
  cc_emails JSONB DEFAULT '[]',
  bcc_emails JSONB DEFAULT '[]',
  reply_to VARCHAR(255),

  -- Email properties
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  is_draft BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_important BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  is_trash BOOLEAN DEFAULT false,

  -- Gmail labels and categories
  labels JSONB DEFAULT '[]',
  categories JSONB DEFAULT '[]',

  -- Performance and search
  has_attachments BOOLEAN DEFAULT false,
  attachment_count INTEGER DEFAULT 0,
  size_bytes BIGINT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_emails_user_id (user_id),
  INDEX idx_emails_contact_id (contact_id),
  INDEX idx_emails_email_account_id (email_account_id),
  INDEX idx_emails_date (date DESC),
  INDEX idx_emails_from_email (from_email),
  INDEX idx_emails_gmail_thread_id (gmail_thread_id)
);

-- Table: email_attachments
-- Stores email attachment metadata
CREATE TABLE IF NOT EXISTS public.email_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE NOT NULL,
  gmail_attachment_id VARCHAR(255),
  filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(255),
  size_bytes BIGINT,
  inline BOOLEAN DEFAULT false,
  content_id VARCHAR(255), -- For inline images
  storage_path TEXT, -- Path in Supabase Storage if downloaded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_attachments_email_id (email_id)
);

-- Table: email_sync_log
-- Tracks sync operations for debugging and monitoring
CREATE TABLE IF NOT EXISTS public.email_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE NOT NULL,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'webhook'
  status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  emails_synced INTEGER DEFAULT 0,
  emails_created INTEGER DEFAULT 0,
  emails_updated INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON public.oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 2. Configurar Row Level Security (RLS)

Crear archivo `supabase/migrations/[timestamp]_gmail_rls_policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sync_log ENABLE ROW LEVEL SECURITY;

-- Policies for email_accounts
CREATE POLICY "Users can view own email accounts" ON public.email_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email accounts" ON public.email_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email accounts" ON public.email_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email accounts" ON public.email_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for oauth_tokens (más restrictivas)
CREATE POLICY "Users can view own tokens" ON public.oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.oauth_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for emails
CREATE POLICY "Users can view own emails" ON public.emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails" ON public.emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails" ON public.emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails" ON public.emails
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for email_attachments
CREATE POLICY "Users can view attachments of own emails" ON public.email_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.emails
      WHERE emails.id = email_attachments.email_id
      AND emails.user_id = auth.uid()
    )
  );

-- Policies for email_sync_log
CREATE POLICY "Users can view own sync logs" ON public.email_sync_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.email_accounts
      WHERE email_accounts.id = email_sync_log.email_account_id
      AND email_accounts.user_id = auth.uid()
    )
  );
```

#### 3. Ejecutar las migraciones

```bash
# Desde la raíz del proyecto
npx supabase migration up
```

O ejecutar manualmente en el SQL Editor de Supabase.

---

## ⚙️ Configuración de Variables de Entorno

### 1. Crear archivo `.env.local`

```bash
# Google OAuth2 Configuration
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Supabase Configuration (ya deberías tener estas)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx

# Gmail API Configuration
VITE_GMAIL_API_BASE_URL=https://gmail.googleapis.com/gmail/v1
VITE_GMAIL_MAX_RESULTS=50
VITE_GMAIL_SYNC_INTERVAL_MS=300000 # 5 minutos

# Feature Flags
VITE_ENABLE_GMAIL_INTEGRATION=true
VITE_ENABLE_EMAIL_COMPOSER=false # Para fase posterior
```

### 2. Actualizar `.gitignore`

Asegurarse de que `.env.local` esté en `.gitignore`:

```gitignore
# Environment variables
.env.local
.env.production
```

### 3. Crear archivo de ejemplo `.env.example`

```bash
# Copy this file to .env.local and fill in your values

# Google OAuth2 Configuration
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gmail API Configuration
VITE_GMAIL_API_BASE_URL=https://gmail.googleapis.com/gmail/v1
VITE_GMAIL_MAX_RESULTS=50
VITE_GMAIL_SYNC_INTERVAL_MS=300000

# Feature Flags
VITE_ENABLE_GMAIL_INTEGRATION=true
VITE_ENABLE_EMAIL_COMPOSER=false
```

---

## ✅ Testing y Validación

### 1. Verificar Google Cloud Console

- [ ] Gmail API está habilitada
- [ ] People API está habilitada
- [ ] Pantalla de consentimiento configurada
- [ ] Credenciales OAuth2 creadas
- [ ] URIs de redirección correctas

### 2. Verificar Base de Datos

Ejecutar en Supabase SQL Editor:

```sql
-- Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('email_accounts', 'oauth_tokens', 'emails', 'email_attachments', 'email_sync_log');

-- Verificar RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('email_accounts', 'oauth_tokens', 'emails');

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('email_accounts', 'oauth_tokens', 'emails');
```

### 3. Verificar Variables de Entorno

```typescript
// Crear src/utils/checkEnv.ts temporalmente para verificar
console.log("Google Client ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
console.log(
  "Gmail Integration Enabled:",
  import.meta.env.VITE_ENABLE_GMAIL_INTEGRATION
);
```

---

## 📝 Checklist Final Fase 1

- [x] Proyecto creado en Google Cloud Console
- [x] Gmail API habilitada
- [x] People API habilitada
- [x] Pantalla de consentimiento OAuth configurada
- [x] Credenciales OAuth2 creadas y guardadas
- [x] Tablas de base de datos creadas en Supabase
- [x] RLS policies configuradas
- [x] Variables de entorno configuradas
- [x] `.env.local` creado con valores correctos
- [x] Migraciones ejecutadas exitosamente
- [x] Tests de verificación pasados

**✅ FASE 1 COMPLETADA EXITOSAMENTE**

## 🚀 Siguiente Fase

✅ **Fase 1 COMPLETADA** - Ahora puedes proceder con:

- **Fase 2**: Implementación del flujo OAuth2 con PKCE
- Crear servicios de autenticación OAuth2
- Implementar UI de conexión con shadcn/ui
- **Estado**: Listo para comenzar desarrollo de código

**Próximos pasos**:

1. Crear `src/services/google/pkceService.ts`
2. Implementar `src/services/google/authService.ts`
3. Crear componentes UI para conexión Gmail

## 📚 Referencias

- [Gmail API Documentation](https://developers.google.com/gmail/api/guides)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [PKCE Flow Explanation](https://auth0.com/docs/flows/authorization-code-flow-with-proof-key-for-code-exchange-pkce)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
