# 📋 Gmail Integration - Service Layer Refactoring Plan

> **Status**: 🔄 **IN PROGRESS**  
> **Start Date**: {{ DATE_TO_BE_FILLED }}  
> **Estimated Duration**: 4 días  
> **Assigned**: Cursor AI Assistant

## 🎯 **Objetivos del Refactoring**

### **Problemas a Resolver:**

- [ ] **Lógica dispersa**: Auth logic en múltiples archivos
- [ ] **Estado global problemático**: Maps globales en `tokenService.ts`
- [ ] **Duplicación de código**: `gmailAuthSlice.ts` vs `use-gmail-auth.ts`
- [ ] **Acoplamiento**: Componentes con llamadas directas a Supabase
- [ ] **Testabilidad**: Difícil testear lógica de negocio

### **Resultado Esperado:**

- [ ] ✅ Service layer limpio y profesional
- [ ] ✅ Zustand store optimizado (solo UI state)
- [ ] ✅ Zero duplicación de lógica
- [ ] ✅ Componentes desacoplados y simples
- [ ] ✅ Arquitectura escalable para futuros providers

---

## 📁 **Estructura Final Propuesta**

```
src/services/gmail/
├── GmailService.ts           # 🆕 Coordinador principal
├── AuthService.ts            # 🆕 OAuth & token management limpio
├── ContactsService.ts        # 🆕 People API wrapper
├── EmailService.ts           # 🆕 Gmail API + sync logic
├── types.ts                  # 🆕 Tipos centralizados
└── index.ts                  # 🆕 Factory functions y exports

src/stores/gmail/
├── gmailStore.ts             # 🆕 Store limpio (solo UI state)
└── index.ts                  # 🆕 Exports

src/hooks/
├── useGmailService.ts        # 🆕 Hook para acceder a services
└── [ELIMINAR] use-gmail-auth.ts  # ❌ Duplicado, se elimina

src/stores/
├── [ELIMINAR] gmailAuthSlice.ts  # ❌ Mezclado, se reemplaza
└── index.ts                      # 🔄 Actualizar exports
```

---

## 🚀 **FASE 1: Crear Service Layer**

**Duración**: Día 1-2  
**Status**: ⏳ **PENDING**

### **1.1 Crear Base de Tipos** ⏳

- [ ] Crear `src/services/gmail/types.ts`
  - [ ] Definir `GmailServiceConfig`
  - [ ] Definir `ConnectionResult`
  - [ ] Definir `SyncResult`
  - [ ] Definir `ImportResult`
  - [ ] Re-exportar tipos existentes de `@/types/google`

### **1.2 Crear AuthService** ⏳

- [ ] Crear `src/services/gmail/AuthService.ts`
  - [ ] Constructor con `userId`
  - [ ] Estado privado (sin globals): `failedAttempts`, `ongoingRefresh`
  - [ ] Método `initiateOAuth(scopes?: string[]): Promise<string>`
  - [ ] Método `handleCallback(code: string, state: string): Promise<TokenData>`
  - [ ] Método `getValidToken(email?: string): Promise<string | null>`
  - [ ] Método `refreshToken(email: string): Promise<string | null>`
  - [ ] Método `revokeToken(email: string): Promise<void>`
  - [ ] Método `getConnectedAccounts(): Promise<GmailAccount[]>`
  - [ ] Método `disconnectAccount(email: string): Promise<void>`
  - [ ] Métodos privados para manejo de tokens

### **1.3 Crear EmailService** ⏳

- [ ] Crear `src/services/gmail/EmailService.ts`
  - [ ] Constructor con `userId` y `authService`
  - [ ] Método `syncContactEmails(contactEmail: string, options?: SyncOptions): Promise<SyncResult>`
  - [ ] Método `getContactEmails(contactEmail: string, options?: GetEmailsOptions): Promise<GmailEmail[]>`
  - [ ] Método `searchEmails(query: string, options?: SearchOptions): Promise<GmailEmail[]>`
  - [ ] Método `markAsRead(gmailId: string): Promise<void>`
  - [ ] Método `deleteEmail(gmailId: string): Promise<void>`
  - [ ] Métodos privados para database y API operations

### **1.4 Crear ContactsService** ⏳

- [ ] Crear `src/services/gmail/ContactsService.ts`
  - [ ] Constructor con `userId` y `authService`
  - [ ] Método `importContacts(options?: ImportOptions): Promise<ImportResult>`
  - [ ] Método `getGoogleContacts(pageToken?: string): Promise<GooglePeopleResponse>`
  - [ ] Método `syncContact(googleContact: GoogleContact): Promise<Contact>`
  - [ ] Métodos privados para deduplicación y mapping

### **1.5 Crear GmailService (Coordinador)** ⏳

- [ ] Crear `src/services/gmail/GmailService.ts`
  - [ ] Constructor con `GmailServiceConfig`
  - [ ] Inicializar services internos: `AuthService`, `EmailService`, `ContactsService`
  - [ ] **Auth methods**:
    - [ ] `connectAccount(scopes?: string[]): Promise<ConnectionResult>`
    - [ ] `disconnectAccount(email: string): Promise<void>`
    - [ ] `getConnectedAccounts(): Promise<GmailAccount[]>`
    - [ ] `getTokenStatus(email: string): Promise<TokenStatus>`
    - [ ] `refreshConnection(email: string): Promise<boolean>`
  - [ ] **Email methods**:
    - [ ] `syncEmails(contactEmail: string, options?: SyncOptions): Promise<SyncResult>`
    - [ ] `getContactEmails(contactEmail: string, options?: GetEmailsOptions): Promise<GmailEmail[]>`
    - [ ] `searchEmails(query: string, options?: SearchOptions): Promise<GmailEmail[]>`
  - [ ] **Contact methods**:
    - [ ] `importContacts(options?: ImportOptions): Promise<ImportResult>`
    - [ ] `getGoogleContacts(): Promise<GoogleContact[]>`
  - [ ] **Utility methods**:
    - [ ] `healthCheck(): Promise<HealthStatus>`
    - [ ] `clearCache(): Promise<void>`
    - [ ] `dispose(): void`

### **1.6 Crear Factory e Index** ⏳

- [ ] Crear `src/services/gmail/index.ts`
  - [ ] Factory function `createGmailService(userId: string, config?: Partial<GmailServiceConfig>): GmailService`
  - [ ] Singleton pattern `getGmailService(userId?: string): GmailService`
  - [ ] Reset function `resetGmailService(): void`
  - [ ] Re-exports de todos los services y tipos

### **🎯 Checkpoint Fase 1:**

- [ ] **5 archivos creados**: `types.ts`, `AuthService.ts`, `EmailService.ts`, `ContactsService.ts`, `GmailService.ts`, `index.ts`
- [ ] **Compilación sin errores** de TypeScript
- [ ] **Lógica migrada** de archivos existentes sin perder funcionalidad
- [ ] **Tests básicos** para cada service (opcional pero recomendado)

---

## 🏪 **FASE 2: Refactor Zustand Store**

**Duración**: Día 2  
**Status**: ⏳ **PENDING**

### **2.1 Crear Nuevo Store** ⏳

- [ ] Crear `src/stores/gmail/gmailStore.ts`
  - [ ] Definir `GmailState` interface (solo UI state):
    - [ ] `accounts: GmailAccount[]`
    - [ ] `loading: boolean`, `connecting: boolean`, `syncing: boolean`
    - [ ] `error: string | null`
    - [ ] `lastSync: Date | null`
    - [ ] `contactEmails: Record<string, GmailEmail[]>` (cache)
    - [ ] `syncResults: Record<string, SyncResult>` (cache)
  - [ ] Definir `GmailActions` interface:
    - [ ] Account management: `loadAccounts`, `connectAccount`, `disconnectAccount`, `refreshAccounts`
    - [ ] Email operations: `syncContactEmails`, `getContactEmails`, `clearContactEmails`
    - [ ] Utility: `clearError`, `clearCache`, `reset`
  - [ ] Implementar store con Zustand + immer + subscribeWithSelector
  - [ ] Implementar todas las acciones usando `getGmailService()`
  - [ ] Crear selectors convenientes: `useGmailAccounts`, `useGmailLoading`, etc.

### **2.2 Crear Index de Store** ⏳

- [ ] Crear `src/stores/gmail/index.ts`
  - [ ] Re-exportar store y selectors

### **2.3 Actualizar Store Principal** ⏳

- [ ] Actualizar `src/stores/index.ts`
  - [ ] Eliminar import de `gmailAuthSlice`
  - [ ] Añadir imports del nuevo gmail store
  - [ ] Verificar que no hay imports rotos

### **🎯 Checkpoint Fase 2:**

- [ ] **Store nuevo funcional** con API limpia
- [ ] **Eliminada duplicación** de lógica de negocio en store
- [ ] **Zustand DevTools** funcionando correctamente
- [ ] **Selectors exportados** y listos para usar en componentes

---

## 🪝 **FASE 3: Crear Hooks de Integración**

**Duración**: Día 2  
**Status**: ⏳ **PENDING**

### **3.1 Crear Hook Principal** ⏳

- [ ] Crear `src/hooks/useGmailService.ts`
  - [ ] Hook `useGmailService()` que retorna instancia del service
  - [ ] Manejo de `userId` desde `useAuth()`
  - [ ] Cleanup automático en logout
  - [ ] Memoización para evitar re-creaciones

### **3.2 Crear Hooks de Operaciones** ⏳

- [ ] En el mismo archivo `useGmailService.ts`:
  - [ ] Hook `useGmailOperations()` para operaciones combinadas
  - [ ] Método `connectAndRefresh()` que conecta + actualiza store
  - [ ] Método `syncAndCache()` que sincroniza + actualiza cache
  - [ ] Otros métodos convenientes según necesidad

### **🎯 Checkpoint Fase 3:**

- [ ] **Hooks listos** para usar en componentes
- [ ] **Integración perfecta** entre services y store
- [ ] **API conveniente** para operaciones comunes

---

## 🔄 **FASE 4: Migrar Componentes**

**Duración**: Día 3  
**Status**: ⏳ **PENDING**

### **4.1 Migrar Componentes Principales** ⏳

- [ ] **GmailAccountsList.tsx**:
  - [ ] Reemplazar llamadas directas a Supabase
  - [ ] Usar `useGmailAccounts()`, `useGmailLoading()`, `useGmailError()`
  - [ ] Usar `useGmailActions().disconnectAccount`
  - [ ] Simplificar lógica de UI
- [ ] **GmailConnectDialog.tsx**:
  - [ ] Reemplazar lógica OAuth compleja
  - [ ] Usar `useGmailActions().connectAccount`
  - [ ] Simplificar manejo de estados
- [ ] **GmailConnectionModal.tsx**:
  - [ ] Migrar a usar service layer
  - [ ] Eliminar llamadas directas a `tokenService`

### **4.2 Migrar Hooks de Email** ⏳

- [ ] **use-hybrid-contact-emails.ts**:
  - [ ] Reemplazar lógica compleja con `gmailService.getContactEmails()`
  - [ ] Usar opciones del service para controlar comportamiento (database vs API)
  - [ ] Simplificar state management
- [ ] **use-contact-emails.ts**:
  - [ ] Similar migración que hybrid
  - [ ] Eliminar duplicación de lógica

### **4.3 Actualizar Otros Componentes** ⏳

- [ ] **Revisar todos los componentes** que usan Gmail:
  - [ ] Buscar imports de `gmailAuthSlice`
  - [ ] Buscar imports de `use-gmail-auth`
  - [ ] Buscar llamadas directas a `tokenService` o `authService`
  - [ ] Reemplazar con nuevos hooks y store

### **🎯 Checkpoint Fase 4:**

- [ ] **Todos los componentes migrados** sin errores de compilación
- [ ] **Funcionalidad conservada** - misma UX para el usuario
- [ ] **Imports actualizados** a nueva arquitectura
- [ ] **Testing manual básico** - conectar/desconectar cuenta funciona

---

## 🗑️ **FASE 5: Eliminar Código Obsoleto**

**Duración**: Día 3  
**Status**: ⏳ **PENDING**

### **5.1 Crear Backups** ⏳

- [ ] Crear carpeta `src/services/google/backup/`
- [ ] Mover archivos obsoletos a backup:
  - [ ] `mv tokenService.ts backup/tokenService.ts.backup`
  - [ ] `mv authService.ts backup/authService.ts.backup`

### **5.2 Eliminar Archivos Duplicados** ⏳

- [ ] `rm src/stores/gmailAuthSlice.ts`
- [ ] `rm src/hooks/use-gmail-auth.ts`

### **5.3 Verificar y Limpiar Imports** ⏳

- [ ] Buscar en todo el proyecto imports rotos:
  - [ ] `grep -r "gmailAuthSlice" src/`
  - [ ] `grep -r "use-gmail-auth" src/`
  - [ ] `grep -r "google/tokenService" src/`
  - [ ] `grep -r "google/authService" src/`
- [ ] Actualizar imports encontrados

### **5.4 Migrar Lógica Útil** ⏳

- [ ] Revisar archivos backup y migrar funciones útiles:
  - [ ] Funciones de `tokenService.ts` que no estén en nuevo `AuthService`
  - [ ] Utilidades de `authService.ts` viejo
  - [ ] Constantes y tipos dispersos

### **🎯 Checkpoint Fase 5:**

- [ ] **Código obsoleto eliminado** sin romper build
- [ ] **Funcionalidad útil preservada** en nueva arquitectura
- [ ] **Imports limpios** en todo el proyecto
- [ ] **Backups creados** por seguridad

---

## 🧪 **FASE 6: Testing y Validación**

**Duración**: Día 4  
**Status**: ⏳ **PENDING**

### **6.1 Unit Tests para Services** ⏳

- [ ] **AuthService.test.ts**:
  - [ ] Test `should connect account successfully`
  - [ ] Test `should handle token refresh`
  - [ ] Test `should manage failed attempts correctly`
  - [ ] Test `should disconnect account properly`
- [ ] **EmailService.test.ts**:
  - [ ] Test `should sync contact emails`
  - [ ] Test `should get emails from database`
  - [ ] Test `should fall back to API when needed`
- [ ] **GmailService.test.ts**:
  - [ ] Test `should coordinate services correctly`
  - [ ] Test `should handle errors gracefully`
  - [ ] Test `should manage config properly`

### **6.2 Integration Tests** ⏳

- [ ] **gmail-flow.test.ts**:
  - [ ] Test complete OAuth flow
  - [ ] Test email sync flow
  - [ ] Test error handling flow
  - [ ] Test store updates correctly

### **6.3 Manual Testing** ⏳

- [ ] **OAuth Flow**:
  - [ ] Conectar cuenta Gmail ✅/❌
  - [ ] Callback handling ✅/❌
  - [ ] Error handling ✅/❌
- [ ] **Account Management**:
  - [ ] Listar cuentas conectadas ✅/❌
  - [ ] Desconectar cuenta Gmail ✅/❌
  - [ ] Refresh de cuentas ✅/❌
- [ ] **Email Operations**:
  - [ ] Sincronizar emails de contacto ✅/❌
  - [ ] Ver emails en timeline ✅/❌
  - [ ] Cache funcionando ✅/❌
- [ ] **Error Scenarios**:
  - [ ] Token expirado ✅/❌
  - [ ] Sin conexión a internet ✅/❌
  - [ ] API rate limits ✅/❌
- [ ] **UI Reactivity**:
  - [ ] Store updates reflejan en UI ✅/❌
  - [ ] Loading states correctos ✅/❌
  - [ ] Error messages apropiados ✅/❌

### **🎯 Checkpoint Fase 6:**

- [ ] **Tests automatizados** pasando (>80% coverage)
- [ ] **Manual testing** completado sin issues críticos
- [ ] **Error handling** robusto y user-friendly
- [ ] **Performance** igual o mejor que antes

---

## 🚀 **FASE 7: Optimización y Pulimiento**

**Duración**: Día 4  
**Status**: ⏳ **PENDING**

### **7.1 Performance Optimizations** ⏳

- [ ] **Cache inteligente**:
  - [ ] Implementar TTL en EmailService
  - [ ] Cache invalidation strategies
  - [ ] Memory management para cache grande
- [ ] **Debouncing**:
  - [ ] Debounce en operaciones frecuentes
  - [ ] Throttle en API calls
- [ ] **Lazy Loading**:
  - [ ] Componentes pesados lazy-loaded
  - [ ] Service initialization on-demand

### **7.2 Error Handling Centralizado** ⏳

- [ ] Crear `src/services/gmail/ErrorHandler.ts`:
  - [ ] `static handle(error: unknown, context: string): GmailError`
  - [ ] `static isRetryable(error: GmailError): boolean`
  - [ ] `static formatUserMessage(error: GmailError): string`
- [ ] Integrar en todos los services
- [ ] Mejorar UX de errores

### **7.3 Logging y Monitoring** ⏳

- [ ] Crear `src/services/gmail/Logger.ts`:
  - [ ] `static logOperation(operation: string, data: any): void`
  - [ ] `static logError(error: GmailError, context: string): void`
  - [ ] `static logPerformance(operation: string, duration: number): void`
- [ ] Integrar logging en operations críticas
- [ ] Setup de monitoring (opcional)

### **7.4 Documentation** ⏳

- [ ] **API Documentation**:
  - [ ] JSDoc en todos los métodos públicos
  - [ ] Examples de uso común
  - [ ] Migration guide desde arquitectura anterior
- [ ] **README Updates**:
  - [ ] Actualizar docs de integración
  - [ ] Nuevos workflows para developers

### **🎯 Checkpoint Fase 7:**

- [ ] **Performance optimizada** y monitoreada
- [ ] **Error handling** robusto y user-friendly
- [ ] **Logging** comprehensivo para debugging
- [ ] **Documentation** completa y actualizada

---

## 📊 **Métricas de Éxito**

### **Antes del Refactoring:** ❌

- [ ] 8 archivos con lógica de Gmail dispersa
- [ ] 3 formas diferentes de cargar cuentas
- [ ] Estado global problemático en `tokenService.ts`
- [ ] Difícil de testear y debuggear
- [ ] Duplicación entre `gmailAuthSlice.ts` y `use-gmail-auth.ts`

### **Después del Refactoring:** ✅

- [ ] 4 services especializados + 1 store limpio
- [ ] 1 sola fuente de verdad para cada operación
- [ ] Estado encapsulado por instancia de usuario
- [ ] 90%+ de cobertura de tests
- [ ] Zero duplicación de lógica

---

## 🎯 **Cronograma Detallado**

| Día       | Fase                            | Actividades                                                         | Entregables                                  | Status |
| --------- | ------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- | ------ |
| **Día 1** | Service Layer (Parte 1)         | Crear types.ts, AuthService.ts, EmailService.ts                     | 3 archivos base                              | ⏳     |
| **Día 2** | Service Layer (Parte 2) + Store | ContactsService.ts, GmailService.ts, index.ts + Nuevo gmailStore.ts | Service layer completo + Store refactorizado | ⏳     |
| **Día 3** | Migración                       | Hooks + Componentes + Eliminar obsoletos                            | Componentes migrados                         | ⏳     |
| **Día 4** | Testing + Polish                | Unit tests + Integration tests + Optimizaciones                     | Sistema completo y testeado                  | ⏳     |

---

## ⚠️ **Riesgos y Mitigaciones**

### **Riesgos Identificados:**

- [ ] **Breaking changes**: Componentes dejan de funcionar
- [ ] **Performance**: Nueva arquitectura más lenta
- [ ] **Bugs**: Lógica migrada incorrectamente
- [ ] **Integration**: Edge Functions dejan de funcionar

### **Mitigaciones:**

- [ ] **Testing incremental**: Cada service testeado aisladamente
- [ ] **Rollback plan**: Git branches + backups de archivos clave
- [ ] **Parallel development**: Mantener código viejo hasta validar nuevo
- [ ] **Progressive migration**: Migrar componente por componente
- [ ] **Manual testing**: Validar cada checkpoint antes de continuar

---

## 📝 **Notas y Decisiones**

### **Decisiones Arquitecturales:**

- [ ] **Singleton pattern** para GmailService por usuario
- [ ] **Factory functions** para easy instantiation
- [ ] **Zustand store** mantiene solo UI state, services manejan business logic
- [ ] **Error handling** centralizado en cada service

### **Trade-offs Considerados:**

- [ ] **Complejidad vs Mantenibilidad**: Más archivos pero más organized
- [ ] **Performance vs Architecture**: Slight overhead por abstraction layers
- [ ] **Migration effort vs Long-term benefits**: Esfuerzo inicial alto pero maintainability mucho mejor

---

## 🏁 **Sign-off y Validación Final**

### **Criterios de Completitud:**

- [ ] **Funcionalidad**: Todo funciona igual o mejor que antes
- [ ] **Performance**: No degradation, idealmente mejor
- [ ] **Testing**: >80% code coverage en services
- [ ] **Documentation**: API docs y migration guide completos
- [ ] **Code Quality**: Linting y TypeScript strict mode sin errores

### **Approval Checklist:**

- [ ] **Technical Lead Approval**: Arquitectura revisada y aprobada
- [ ] **QA Testing**: Manual testing completado
- [ ] **Performance Testing**: Benchmarks comparados con versión anterior
- [ ] **Security Review**: Tokens y auth flow validados

---

**Final Status**: ⏳ **READY TO START**

**Next Action**: Comenzar Fase 1 - Crear Service Layer
