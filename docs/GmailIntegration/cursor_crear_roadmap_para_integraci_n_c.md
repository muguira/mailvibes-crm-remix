# Crear roadmap para integración con Gmail
_Exported on 7/4/2025 at 02:00:15 GMT-4 from Cursor (1.1.7)_

---

**User**

Necesito hacer una integracion con gmail en este proyecto. Te voy a pasar la tarea que esta en click up y que me fue asignada donde explica mas a detalle sobre este feature de integracion. Y tambien te pasare mas informacion sobre este proyecto. Que es lo que quiero que tu hagas?. Que me crees un roadmap completo para poder dividir este feature en varias tareas de click up y que el trabajao sea mas facil, recuerda necesito un roadmap completo y detallado de como lograr hacer este feature. Recuerda analizar este proyecto para poder crear bien el roadmap tanto las carpetas como codigo etc.



Informacion sobre el estado del proyecto actual:
- Stack:
-- React.JS
-- Supabase (el proyecto no tiene backend solo usa supabase)
-- Zustand
-- TailwindCSS
-- Vercel

Nota: en la imagen que te pase esta el schema de la base de datos que se usa en este proyecto.

Tarea de click up:


🎯 **Goal/Outcome**
Streamline Gmail contact import to CRM with 90% automation rate and <2s email timeline loading

💡 **Context**
• Currently no automated way to import Gmail contacts and view email history in CRM
• Manual contact entry and email reference creates significant productivity loss for sales teams
• Gmail API v2 and OAuth2 integration required for secure access to contacts and email data
• Will impact all sales users by providing complete communication context within CRM interface

🔍 **Scope**
1. Implement Gmail OAuth2 flow with shadcn/ui modal components and secure token storage
2. Develop Gmail API integration for contacts import and email history retrieval
3. Create real-time email timeline stream in CRM contact views
4. Set up background sync for ongoing email communication updates

🔧 **Technical Notes**
• Use Gmail API batch operations for efficient contact imports
• Implement Redis caching for email timeline data with 15-minute TTL
• Configure webhook listeners for real-time email updates
• Store email metadata only, with lazy loading of full content
• Use shadcn/ui Dialog, Card, and Timeline components for UI

✅ **Subtasks/Checklist**
• Build OAuth2 flow UI with shadcn/ui Dialog component
• Implement Gmail API contact import with pagination handling
• Create email timeline component with virtual scrolling
• Set up background worker for email sync maintenance
• Implement contact matching/deduplication logic
• Add email content preview with lazy loading
• Create email search/filter functionality
• Add batch import progress indicators and error handling

✅ **Acceptance Criteria**

**AC-1** | Gmail OAuth2 flow completes in <3 clicks with >95% success rate | *OAuth flow monitoring metrics*
**AC-2** | Contact import processes 1000 contacts in <30 seconds | *Import job timing logs*
**AC-3** | Email timeline loads last 50 emails in <2 seconds | *Frontend performance monitoring*
**AC-4** | Real-time email updates appear within 1 minute | *End-to-end sync timing tests*

⏱️ **Time Estimate**
10h with AI-accelerated development (Cursor + Claude + AI copilots provide 5-10x speed boost)

🔥 **Priority**
High - directly impacts lead conversion & CRM data quality



---

**Cursor**

Entiendo perfectamente. Necesitas un roadmap completo y detallado para implementar la integración con Gmail en tu proyecto CRM. Voy a analizar primero la estructura actual del proyecto para crear un roadmap que se alinee con la arquitectura existente y que puedas dividir en tareas específicas de ClickUp.

Déjame explorar el proyecto actual para entender mejor cómo está organizado:

Perfecto, después de analizar el proyecto actual, te voy a crear un roadmap completo y detallado para la integración con Gmail. Este roadmap está diseñado para dividirse en múltiples tareas de ClickUp que puedas trabajar de forma incremental.

## 🚀 ROADMAP COMPLETO: INTEGRACIÓN GMAIL EN MAILVIBES CRM

### 📋 FASE 1: PREPARACIÓN E INFRAESTRUCTURA (2-3 días)

#### Tarea 1.1: Configuración del Proyecto en Google Cloud Console
**Descripción**: Configurar el proyecto en Google Cloud para usar Gmail API
**Subtareas**:
- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar Gmail API
- [ ] Crear credenciales OAuth2 (Client ID y Client Secret)
- [ ] Configurar URIs de redirección autorizados para desarrollo y producción
- [ ] Configurar pantalla de consentimiento OAuth
- [ ] Agregar scopes necesarios: `gmail.readonly`, `gmail.modify`, `contacts.readonly`

**Archivos a crear**:
```
.env.local
- VITE_GOOGLE_CLIENT_ID=xxx
- VITE_GOOGLE_CLIENT_SECRET=xxx (solo para desarrollo)
- VITE_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

#### Tarea 1.2: Diseño de Base de Datos para Emails
**Descripción**: Crear las tablas necesarias en Supabase para almacenar emails y tokens
**Subtareas**:
- [ ] Crear migración para tabla `email_accounts`
- [ ] Crear migración para tabla `emails`
- [ ] Crear migración para tabla `email_attachments`
- [ ] Crear migración para tabla `oauth_tokens`
- [ ] Configurar RLS policies

**Schema sugerido**:
```sql
-- email_accounts table
CREATE TABLE email_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  provider VARCHAR(50) DEFAULT 'gmail',
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- emails table
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  gmail_id VARCHAR(255) UNIQUE,
  thread_id VARCHAR(255),
  subject TEXT,
  snippet TEXT,
  body_text TEXT,
  body_html TEXT,
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  to_emails JSONB,
  cc_emails JSONB,
  bcc_emails JSONB,
  date TIMESTAMP WITH TIME ZONE,
  is_sent BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  labels JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- oauth_tokens table
CREATE TABLE oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 📋 FASE 2: AUTENTICACIÓN OAUTH2 (2 días)

#### Tarea 2.1: Implementar Flujo OAuth2 con Google
**Descripción**: Crear el flujo completo de autenticación con Google
**Archivos a crear/modificar**:
```
src/services/google/
├── authService.ts          # Manejo de OAuth2 flow
├── tokenService.ts         # Gestión de tokens
└── types.ts               # TypeScript types

src/components/integrations/gmail/
├── GmailConnectDialog.tsx  # Modal de conexión con shadcn/ui
├── GmailAccountsList.tsx   # Lista de cuentas conectadas
└── index.ts
```

**Subtareas**:
- [ ] Crear servicio de autenticación OAuth2
- [ ] Implementar intercambio de código por tokens
- [ ] Crear sistema de refresh de tokens
- [ ] Implementar almacenamiento seguro de tokens en Supabase
- [ ] Crear UI con shadcn/ui Dialog para conectar cuenta

#### Tarea 2.2: Integrar OAuth en la Página de Integraciones
**Descripción**: Añadir Gmail a la página existente de integraciones
**Archivos a modificar**:
```
src/pages/dashboard/Integrations.tsx
```

**Subtareas**:
- [ ] Añadir Gmail como opción de integración
- [ ] Crear botón "Connect Gmail Account"
- [ ] Mostrar cuentas conectadas
- [ ] Implementar desconexión de cuentas
- [ ] Añadir indicadores de estado de sincronización

### 📋 FASE 3: IMPORTACIÓN DE CONTACTOS (2 días)

#### Tarea 3.1: Servicio de Importación de Contactos Gmail
**Descripción**: Crear servicio para importar contactos desde Google People API
**Archivos a crear**:
```
src/services/google/
├── contactsService.ts      # Importación de contactos
└── peopleApi.ts           # Wrapper para People API
```

**Subtareas**:
- [ ] Implementar cliente de Google People API
- [ ] Crear función de importación con paginación
- [ ] Implementar mapeo de contactos Google a schema local
- [ ] Crear lógica de deduplicación
- [ ] Implementar importación batch (100 contactos por vez)

#### Tarea 3.2: UI de Importación de Contactos
**Descripción**: Crear interfaz para importar contactos
**Archivos a crear**:
```
src/components/integrations/gmail/
├── ContactImportWizard.tsx  # Wizard de importación
├── ContactPreview.tsx       # Preview de contactos a importar
└── ImportProgress.tsx       # Indicador de progreso
```

**Subtareas**:
- [ ] Crear wizard multi-paso con shadcn/ui
- [ ] Implementar preview de contactos antes de importar
- [ ] Añadir selección de lista destino
- [ ] Crear indicadores de progreso en tiempo real
- [ ] Implementar manejo de errores y reintentos

### 📋 FASE 4: SINCRONIZACIÓN DE EMAILS (3 días)

#### Tarea 4.1: Servicio de Sincronización de Emails
**Descripción**: Implementar servicio para sincronizar emails con Gmail API
**Archivos a crear**:
```
src/services/google/
├── gmailService.ts         # Servicio principal de Gmail
├── emailSyncService.ts     # Lógica de sincronización
└── emailParser.ts          # Parser de emails MIME
```

**Subtareas**:
- [ ] Implementar cliente de Gmail API
- [ ] Crear función de sincronización inicial (últimos 50 emails)
- [ ] Implementar parser de emails MIME
- [ ] Crear sistema de matching email-contacto
- [ ] Implementar caché con TTL de 15 minutos

#### Tarea 4.2: Background Worker para Sincronización
**Descripción**: Crear worker para mantener emails actualizados
**Archivos a crear**:
```
src/workers/
├── emailSyncWorker.ts      # Worker principal
└── syncScheduler.ts        # Programador de sincronización
```

**Subtareas**:
- [ ] Implementar worker con Web Workers API
- [ ] Crear scheduler para sincronización periódica
- [ ] Implementar sincronización incremental
- [ ] Añadir gestión de errores y reintentos
- [ ] Crear sistema de notificaciones de nuevos emails

### 📋 FASE 5: TIMELINE DE EMAILS (2 días)

#### Tarea 5.1: Componente de Timeline de Emails
**Descripción**: Crear componente para mostrar emails en el timeline
**Archivos a crear/modificar**:
```
src/components/stream/
├── EmailTimelineItem.tsx    # Item de email en timeline
├── EmailPreview.tsx         # Preview de contenido email
└── EmailAttachments.tsx     # Visualización de attachments

src/components/stream/StreamTimeline.tsx (modificar)
```

**Subtareas**:
- [ ] Crear componente EmailTimelineItem
- [ ] Implementar preview con lazy loading
- [ ] Añadir soporte para attachments
- [ ] Integrar con timeline existente
- [ ] Implementar virtual scrolling para performance

#### Tarea 5.2: Filtros y Búsqueda de Emails
**Descripción**: Añadir capacidad de filtrar y buscar emails
**Archivos a crear**:
```
src/components/stream/
├── EmailFilters.tsx         # Filtros de emails
└── EmailSearch.tsx          # Búsqueda de emails
```

**Subtareas**:
- [ ] Crear filtros por fecha, remitente, asunto
- [ ] Implementar búsqueda full-text
- [ ] Añadir filtros por etiquetas Gmail
- [ ] Crear UI con shadcn/ui Popover
- [ ] Implementar persistencia de filtros

### 📋 FASE 6: FUNCIONES AVANZADAS (1 día)

#### Tarea 6.1: Responder y Componer Emails
**Descripción**: Añadir capacidad de responder emails desde el CRM
**Archivos a crear**:
```
src/components/email/
├── EmailComposer.tsx        # Composer de emails
├── EmailReplyDialog.tsx     # Dialog para responder
└── EmailTemplates.tsx       # Templates de email
```

**Subtareas**:
- [ ] Crear composer con editor rich text
- [ ] Implementar envío a través de Gmail API
- [ ] Añadir soporte para templates
- [ ] Crear historial de borradores
- [ ] Implementar adjuntar archivos

#### Tarea 6.2: Webhooks y Real-time Updates
**Descripción**: Implementar actualizaciones en tiempo real
**Archivos a crear**:
```
src/services/google/
├── webhookService.ts        # Manejo de webhooks
└── realtimeSync.ts         # Sincronización real-time
```

**Subtareas**:
- [ ] Configurar Google Pub/Sub para webhooks
- [ ] Implementar endpoint para recibir webhooks
- [ ] Crear sistema de actualización real-time
- [ ] Implementar reconexión automática
- [ ] Añadir indicadores de estado de conexión

### 📋 FASE 7: OPTIMIZACIÓN Y TESTING (1 día)

#### Tarea 7.1: Optimización de Performance
**Subtareas**:
- [ ] Implementar caché Redis para emails
- [ ] Optimizar queries de Supabase
- [ ] Añadir índices a tablas de emails
- [ ] Implementar compresión de datos
- [ ] Optimizar carga de imágenes en emails

#### Tarea 7.2: Testing y Documentación
**Subtareas**:
- [ ] Escribir tests unitarios para servicios
- [ ] Crear tests de integración
- [ ] Documentar API de servicios
- [ ] Crear guía de usuario
- [ ] Añadir logging y monitoring

### 🎯 ENTREGABLES FINALES

1. **Flujo OAuth2 completo** con UI en shadcn/ui
2. **Importación de contactos** con deduplicación
3. **Timeline de emails** integrado en vista de contacto
4. **Sincronización automática** cada minuto
5. **Búsqueda y filtros** de emails
6. **Indicadores de progreso** para todas las operaciones
7. **Manejo de errores** robusto
8. **Performance optimizada** (<2s carga de timeline)

### 📊 ESTIMACIÓN DE TIEMPO

- **Total**: 10-12 días con desarrollo acelerado por AI
- **Fase 1-2**: 4-5 días (Infraestructura + OAuth)
- **Fase 3-4**: 5 días (Contactos + Emails)
- **Fase 5-7**: 3-4 días (UI + Optimización)

### 🔧 STACK TÉCNICO SUGERIDO

- **Frontend**: React + TypeScript + shadcn/ui
- **Estado**: Zustand (existente)
- **API**: Gmail API v2 + People API v1
- **Cache**: localStorage + Supabase (con TTL)
- **Background**: Web Workers
- **Real-time**: Google Pub/Sub + Supabase Realtime

¿Te gustaría que profundice en alguna fase específica o que empiece a crear el código para alguna de las tareas?

```plaintext
.env.local
- VITE_GOOGLE_CLIENT_ID=xxx
- VITE_GOOGLE_CLIENT_SECRET=xxx (solo para desarrollo)
- VITE_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

```sql
-- email_accounts table
CREATE TABLE email_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  provider VARCHAR(50) DEFAULT 'gmail',
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- emails table
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  gmail_id VARCHAR(255) UNIQUE,
  thread_id VARCHAR(255),
  subject TEXT,
  snippet TEXT,
  body_text TEXT,
  body_html TEXT,
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  to_emails JSONB,
  cc_emails JSONB,
  bcc_emails JSONB,
  date TIMESTAMP WITH TIME ZONE,
  is_sent BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  labels JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- oauth_tokens table
CREATE TABLE oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

```plaintext
src/services/google/
├── authService.ts          # Manejo de OAuth2 flow
├── tokenService.ts         # Gestión de tokens
└── types.ts               # TypeScript types

src/components/integrations/gmail/
├── GmailConnectDialog.tsx  # Modal de conexión con shadcn/ui
├── GmailAccountsList.tsx   # Lista de cuentas conectadas
└── index.ts
```

```plaintext
src/pages/dashboard/Integrations.tsx
```

```plaintext
src/services/google/
├── contactsService.ts      # Importación de contactos
└── peopleApi.ts           # Wrapper para People API
```

```plaintext
src/components/integrations/gmail/
├── ContactImportWizard.tsx  # Wizard de importación
├── ContactPreview.tsx       # Preview de contactos a importar
└── ImportProgress.tsx       # Indicador de progreso
```

```plaintext
src/services/google/
├── gmailService.ts         # Servicio principal de Gmail
├── emailSyncService.ts     # Lógica de sincronización
└── emailParser.ts          # Parser de emails MIME
```

```plaintext
src/workers/
├── emailSyncWorker.ts      # Worker principal
└── syncScheduler.ts        # Programador de sincronización
```

```plaintext
src/components/stream/
├── EmailTimelineItem.tsx    # Item de email en timeline
├── EmailPreview.tsx         # Preview de contenido email
└── EmailAttachments.tsx     # Visualización de attachments

src/components/stream/StreamTimeline.tsx (modificar)
```

```plaintext
src/components/stream/
├── EmailFilters.tsx         # Filtros de emails
└── EmailSearch.tsx          # Búsqueda de emails
```

```plaintext
src/components/email/
├── EmailComposer.tsx        # Composer de emails
├── EmailReplyDialog.tsx     # Dialog para responder
└── EmailTemplates.tsx       # Templates de email
```

```plaintext
src/services/google/
├── webhookService.ts        # Manejo de webhooks
└── realtimeSync.ts         # Sincronización real-time
```

---

**User**

Hay algo que note. en la seccion  AUTENTICACIÓN OAUTH2 (2 días) tienes contenplado que no tengo backend y solo usamos supabase ? quizas si lo contenplaste pero no lo mencionaste, solo quiero una respuesta corta.

---

**Cursor**

Sí, lo contemplé pero no fui explícito. Para OAuth2 sin backend tradicional, el plan es usar:

1. **PKCE flow** (Proof Key for Code Exchange) - diseñado para SPAs sin backend
2. **Supabase Edge Functions** para el intercambio seguro de código por tokens
3. **Almacenamiento de tokens** encriptados en Supabase

Esto mantiene el `client_secret` seguro sin exponer en el frontend. ¿Quieres que detalle más esta parte?

