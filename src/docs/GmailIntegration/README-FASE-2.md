# 📋 FASE 2: AUTENTICACIÓN OAUTH2 CON PKCE

## 📌 Resumen

Esta fase implementa el flujo completo de autenticación OAuth2 con PKCE (Proof Key for Code Exchange) para conectar cuentas de Gmail de forma segura sin necesidad de backend tradicional.

**Estado**: 🚧 EN PROGRESO  
**Duración estimada**: 2-3 días  
**Prioridad**: Alta - Bloquea Fases 3-7  
**Dependencias**: ✅ Fase 1 completada

## 🎯 Objetivos

1. **Implementar flujo PKCE** para autenticación segura en SPA
2. **Crear servicios OAuth2** para manejo de tokens
3. **Desarrollar UI de conexión** con shadcn/ui
4. **Integrar con Supabase** para almacenamiento seguro
5. **Añadir a página de integraciones** existente

## 🔧 Arquitectura Técnica

### Flujo PKCE (Sin Backend)

```
1. Frontend genera code_verifier y code_challenge
2. Redirige a Google OAuth con code_challenge
3. Google redirige de vuelta con authorization_code
4. Frontend intercambia code + code_verifier por tokens
5. Tokens se almacenan encriptados en Supabase
```

### Stack Tecnológico

- **OAuth2**: Flujo PKCE (RFC 7636)
- **APIs**: Google OAuth2 + Gmail API
- **Storage**: Supabase (oauth_tokens table)
- **UI**: shadcn/ui (Dialog, Button, Card)
- **Estado**: Zustand (integrado con store existente)

## 📁 Estructura de Archivos

```
src/
├── services/google/
│   ├── pkceService.ts          # Generación PKCE y validación
│   ├── authService.ts          # Flujo OAuth2 completo
│   ├── tokenService.ts         # Gestión y refresh de tokens
│   └── types.ts               # TypeScript definitions
├── components/integrations/gmail/
│   ├── GmailConnectDialog.tsx  # Modal de conexión
│   ├── GmailAccountsList.tsx   # Lista de cuentas conectadas
│   ├── GmailConnectionCard.tsx # Card de estado de conexión
│   └── index.ts               # Exports
├── hooks/
│   └── use-gmail-auth.ts      # Hook para manejo de auth
└── stores/
    └── gmailAuthSlice.ts      # Zustand slice para Gmail auth
```

## 🚀 Tareas Detalladas

### Tarea 2.1: Servicios Base OAuth2

#### 2.1.1 Crear PKCE Service

**Archivo**: `src/services/google/pkceService.ts`

```typescript
// Funciones requeridas:
- generateCodeVerifier(): string
- generateCodeChallenge(verifier: string): string
- validateCodeChallenge(verifier: string, challenge: string): boolean
- generateState(): string
```

#### 2.1.2 Crear Auth Service

**Archivo**: `src/services/google/authService.ts`

```typescript
// Funciones requeridas:
- buildAuthUrl(codeChallenge: string, state: string): string
- exchangeCodeForTokens(code: string, codeVerifier: string): Promise<TokenResponse>
- refreshAccessToken(refreshToken: string): Promise<TokenResponse>
- revokeTokens(accessToken: string): Promise<void>
```

#### 2.1.3 Crear Token Service

**Archivo**: `src/services/google/tokenService.ts`

```typescript
// Funciones requeridas:
- saveTokens(userId: string, tokens: TokenData): Promise<void>
- getValidToken(userId: string): Promise<string | null>
- refreshTokenIfNeeded(userId: string): Promise<string | null>
- deleteTokens(userId: string): Promise<void>
```

#### 2.1.4 Crear Types

**Archivo**: `src/services/google/types.ts`

```typescript
// Interfaces requeridas:
-TokenResponse - TokenData - AuthState - GmailAccount - AuthError;
```

### Tarea 2.2: Componentes UI

#### 2.2.1 Dialog de Conexión

**Archivo**: `src/components/integrations/gmail/GmailConnectDialog.tsx`

**Características**:

- Modal con shadcn/ui Dialog
- Botón "Connect Gmail Account"
- Indicador de carga durante auth
- Manejo de errores
- Callback URL handling

#### 2.2.2 Lista de Cuentas

**Archivo**: `src/components/integrations/gmail/GmailAccountsList.tsx`

**Características**:

- Mostrar cuentas conectadas
- Estado de sincronización
- Botón desconectar
- Última sincronización
- Indicadores de estado

#### 2.2.3 Card de Conexión

**Archivo**: `src/components/integrations/gmail/GmailConnectionCard.tsx`

**Características**:

- Card con información de cuenta
- Avatar del usuario
- Estado de conexión
- Botones de acción
- Estadísticas básicas

### Tarea 2.3: Integración con Zustand

#### 2.3.1 Crear Gmail Auth Slice

**Archivo**: `src/stores/gmailAuthSlice.ts`

```typescript
// Estado requerido:
- connectedAccounts: GmailAccount[]
- isConnecting: boolean
- authError: string | null
- lastSync: Date | null

// Acciones requeridas:
- connectAccount()
- disconnectAccount()
- refreshConnection()
- setAuthError()
```

#### 2.3.2 Crear Hook Personalizado

**Archivo**: `src/hooks/use-gmail-auth.ts`

```typescript
// Funciones requeridas:
-useGmailAuth() - useGmailAccounts() - useGmailConnection();
```

### Tarea 2.4: Integración con Página Existente

#### 2.4.1 Modificar Página de Integraciones

**Archivo**: `src/pages/dashboard/Integrations.tsx`

**Cambios requeridos**:

- Añadir sección Gmail
- Integrar GmailConnectionCard
- Mostrar estado de conexión
- Añadir botón de configuración

## 🔐 Consideraciones de Seguridad

### Variables de Entorno Requeridas

```env
# OAuth2 Configuration
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Gmail API Configuration
VITE_GMAIL_API_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/contacts.readonly
```

### Seguridad PKCE

- ✅ No client_secret en frontend
- ✅ Code verifier generado aleatoriamente
- ✅ State parameter para CSRF protection
- ✅ Tokens encriptados en Supabase
- ✅ Refresh tokens seguros

## 📋 Criterios de Aceptación

### AC-1: Flujo OAuth2 Funcional

- [ ] Usuario puede iniciar conexión con Gmail
- [ ] Redirección a Google funciona correctamente
- [ ] Callback maneja authorization code
- [ ] Tokens se almacenan en Supabase
- [ ] Manejo de errores robusto

### AC-2: UI Integrada

- [ ] Modal de conexión con shadcn/ui
- [ ] Lista de cuentas conectadas
- [ ] Indicadores de estado claros
- [ ] Botones de desconexión
- [ ] Integración con página existente

### AC-3: Gestión de Tokens

- [ ] Refresh automático de tokens
- [ ] Almacenamiento seguro en Supabase
- [ ] Revocación de tokens
- [ ] Manejo de tokens expirados

### AC-4: Estado de la Aplicación

- [ ] Zustand store integrado
- [ ] Hooks personalizados funcionando
- [ ] Estado persistente entre sesiones
- [ ] Sincronización con Supabase

## 🧪 Testing

### Tests Requeridos

```
tests/
├── services/
│   ├── pkceService.test.ts
│   ├── authService.test.ts
│   └── tokenService.test.ts
├── components/
│   ├── GmailConnectDialog.test.tsx
│   └── GmailAccountsList.test.tsx
└── hooks/
    └── use-gmail-auth.test.ts
```

### Casos de Prueba

- [ ] Generación PKCE correcta
- [ ] Flujo OAuth2 completo
- [ ] Manejo de errores de auth
- [ ] Refresh de tokens
- [ ] UI responsive
- [ ] Estado persistente

## 📝 Checklist de Implementación

### Servicios Base

- [ ] `pkceService.ts` creado y testeado
- [ ] `authService.ts` implementado
- [ ] `tokenService.ts` con Supabase integration
- [ ] `types.ts` con todas las interfaces

### Componentes UI

- [ ] `GmailConnectDialog.tsx` con shadcn/ui
- [ ] `GmailAccountsList.tsx` funcional
- [ ] `GmailConnectionCard.tsx` completo
- [ ] Estilos responsive aplicados

### Estado y Hooks

- [ ] `gmailAuthSlice.ts` en Zustand
- [ ] `use-gmail-auth.ts` hook personalizado
- [ ] Integración con store existente

### Integración

- [ ] Página de integraciones actualizada
- [ ] Routing para callback OAuth2
- [ ] Variables de entorno configuradas
- [ ] Tests unitarios pasando

### Verificación Final

- [ ] Flujo OAuth2 funciona end-to-end
- [ ] Tokens se almacenan correctamente
- [ ] UI integrada sin errores
- [ ] Estado persiste entre sesiones
- [ ] Manejo de errores robusto

## 🚀 Siguiente Fase

Una vez completada la Fase 2, estarás listo para:

- **Fase 3**: Importación de Contactos desde Gmail
- Integración con Google People API
- Mapeo y deduplicación de contactos
- UI de importación masiva

## 📚 Referencias

- [RFC 7636 - PKCE](https://tools.ietf.org/html/rfc7636)
- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API OAuth2 Guide](https://developers.google.com/gmail/api/auth/web-server)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)

## 🐛 Troubleshooting

### Problemas Comunes

1. **CORS Error**: Verificar redirect URI en Google Console
2. **Invalid Grant**: Code verifier no coincide
3. **Token Expired**: Implementar refresh automático
4. **State Mismatch**: Verificar generación de state parameter

### Debug Tips

- Usar console.log para verificar PKCE parameters
- Verificar network tab para requests OAuth2
- Comprobar Supabase logs para errores de storage
- Testear con diferentes navegadores
