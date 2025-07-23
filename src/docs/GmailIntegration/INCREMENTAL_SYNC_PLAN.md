# 📧 Plan de Sincronización Incremental con Gmail History API

## 🎯 **Objetivo**

Implementar sincronización incremental inteligente usando Gmail History API para descargar solo emails nuevos en visitas subsecuentes al StreamView, mejorando el performance en **8-10x** y reduciendo el ancho de banda en **95%**.

## 📊 **Beneficios Esperados**

| Escenario            | Tiempo Actual | Con History API   | Mejora               |
| -------------------- | ------------- | ----------------- | -------------------- |
| **1er contacto**     | 30 segundos   | 30 segundos       | **Igual**            |
| **2da visita**       | 30 segundos   | **3-4 segundos**  | **8-10x más rápido** |
| **10,000 contactos** | 3-4 horas     | **45-60 minutos** | **4-5x más rápido**  |

---

## 🔍 **Análisis del Gmail History API**

### **¿Cómo Funciona?**

```typescript
// Primera vez (Full Sync)
GET /gmail/v1/users/me/messages?maxResults=500
// Respuesta incluye: historyId: "CPDAlvWDx70CEPDAL..."

// Siguientes veces (Incremental Sync)
GET /gmail/v1/users/me/history?startHistoryId=CPDAlvWDx70CEPDAL
// Solo devuelve cambios: nuevos emails, eliminados, modificados
```

### **Capacidades del History API:**

- ✅ **Solo emails nuevos**: `messagesAdded[]`
- ✅ **Solo emails eliminados**: `messagesDeleted[]`
- ✅ **Solo cambios de labels**: `labelsAdded[]`, `labelsRemoved[]`
- ✅ **Filtros por tipo**: `historyTypes: ['messageAdded']`
- ✅ **Paginación eficiente**: `maxResults: 500`
- ✅ **Válido por 1 semana**: Fallback automático a full sync

---

## 📋 **FASE 1: Actualización de Base de Datos**

### **1.1 Migración de Base de Datos**

- [ ] **Crear migración** `20250127000001_add_gmail_history_tracking.sql`
- [ ] **Agregar columna historyId** a tabla `email_sync_log`
- [ ] **Agregar columna last_history_id** a tabla `email_accounts`
- [ ] **Crear índices** para optimizar consultas de historyId
- [ ] **Actualizar RLS policies** para nuevas columnas

**Archivo**: `supabase/migrations/20250127000001_add_gmail_history_tracking.sql`

```sql
-- Agregar tracking de historyId para sincronización incremental
ALTER TABLE email_sync_log ADD COLUMN gmail_history_id TEXT;
ALTER TABLE email_accounts ADD COLUMN last_history_id TEXT;

-- Crear índices para performance
CREATE INDEX idx_email_sync_log_history_id ON email_sync_log(gmail_history_id);
CREATE INDEX idx_email_accounts_history_id ON email_accounts(last_history_id);

-- Actualizar políticas RLS (si es necesario)
-- Las políticas existentes deberían cubrir las nuevas columnas automáticamente
```

### **1.2 Verificación de Migración**

- [ ] **Ejecutar migración** en desarrollo: `supabase db push`
- [ ] **Verificar columnas** agregadas correctamente
- [ ] **Verificar índices** creados: `EXPLAIN` queries
- [ ] **Testing de RLS** con usuario de prueba

---

## 📋 **FASE 2: Actualización de Servicios**

### **2.1 Actualizar `use-contact-email-sync.ts`**

- [ ] **Reemplazar cache en memoria** con consultas de base de datos
- [ ] **Implementar `getSyncStatusFromDB()`** para verificar estado
- [ ] **Implementar `shouldPerformFullSync()`** con lógica inteligente
- [ ] **Actualizar `syncContactEmails()`** para usar History API
- [ ] **Implementar `saveHistoryId()`** después de sync exitoso

**Archivo**: `src/hooks/use-contact-email-sync.ts`

```typescript
// Nueva función para obtener estado desde DB
const getSyncStatusFromDB = async (contactEmail: string, userId: string) => {
  // 1. Contar emails existentes para este contacto
  const { count: existingEmails } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .or(`from_email.eq.${contactEmail},to_emails.cs.[{"email":"${contactEmail}"}]`)

  // 2. Obtener último historyId del contacto
  const { data: syncLog } = await supabase
    .from('email_sync_log')
    .select('gmail_history_id, completed_at')
    .contains('metadata', { contact_email: contactEmail })
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  // 3. Verificar cuenta de email activa
  const { data: emailAccount } = await supabase
    .from('email_accounts')
    .select('last_history_id, last_sync_at')
    .eq('user_id', userId)
    .eq('sync_enabled', true)
    .single()

  return {
    hasExistingEmails: existingEmails > 0,
    lastHistoryId: syncLog?.gmail_history_id || emailAccount?.last_history_id,
    lastSyncAt: syncLog?.completed_at || emailAccount?.last_sync_at,
    shouldUseIncremental: existingEmails > 0 && !!syncLog?.gmail_history_id,
  }
}
```

### **2.2 Implementar Lógica de History API**

- [ ] **Crear `fetchIncrementalChanges()`** usando History API
- [ ] **Implementar `processHistoryChanges()`** para filtrar por contacto
- [ ] **Crear `fallbackToFullSync()`** cuando History API falla
- [ ] **Implementar `updateHistoryId()`** en metadata

```typescript
const fetchIncrementalChanges = async (lastHistoryId: string, contactEmail: string, gmailService: any) => {
  try {
    const changes = await gmailService.users.history.list({
      userId: 'me',
      startHistoryId: lastHistoryId,
      historyTypes: ['messageAdded'], // Solo emails nuevos
      maxResults: 500,
    })

    // Filtrar cambios relevantes para este contacto
    const relevantEmails = changes.data.history
      ?.flatMap(h => h.messagesAdded || [])
      .map(ma => ma.message)
      .filter(msg => isMessageFromContact(msg, contactEmail))

    return {
      newEmails: relevantEmails || [],
      newHistoryId: changes.data.historyId,
      hasMore: !!changes.data.nextPageToken,
    }
  } catch (error) {
    if (error.status === 404) {
      // HistoryId expirado - fallback a full sync
      throw new Error('HISTORY_EXPIRED')
    }
    throw error
  }
}
```

### **2.3 Actualizar `syncContactEmails()` Principal**

- [ ] **Integrar lógica de decisión** (incremental vs full sync)
- [ ] **Implementar flujo híbrido** con fallback automático
- [ ] **Actualizar progress tracking** para mostrar tipo de sync
- [ ] **Mejorar error handling** para casos edge

```typescript
const syncContactEmails = async (contactEmail: string, options: EmailSyncOptions = {}) => {
  const { user } = useAuth()
  if (!user?.id) return

  try {
    // 1. Obtener estado actual desde DB
    const syncStatus = await getSyncStatusFromDB(contactEmail, user.id)

    // 2. Decidir tipo de sincronización
    const useIncremental = syncStatus.shouldUseIncremental && !options.forceFullSync && syncStatus.lastHistoryId

    if (useIncremental) {
      // 3a. Sincronización incremental
      const changes = await fetchIncrementalChanges(syncStatus.lastHistoryId, contactEmail, gmailService)

      await processIncrementalEmails(changes.newEmails, contactEmail)
      await updateSyncLog(contactEmail, 'incremental', changes.newHistoryId)
    } else {
      // 3b. Sincronización completa
      const allEmails = await fetchAllContactEmails(contactEmail)
      await processFullEmailSync(allEmails, contactEmail)
      await updateSyncLog(contactEmail, 'full', allEmails.historyId)
    }
  } catch (error) {
    if (error.message === 'HISTORY_EXPIRED') {
      // Fallback automático a full sync
      return syncContactEmails(contactEmail, { ...options, forceFullSync: true })
    }
    throw error
  }
}
```

---

## 📋 **FASE 3: Actualización de Gmail Service**

### **3.1 Actualizar `gmailApi.ts`**

- [ ] **Agregar método `getHistory()`** para History API
- [ ] **Optimizar `getRecentContactEmails()`** para usar historyId
- [ ] **Implementar `getEmailsByHistoryId()`** para cambios específicos
- [ ] **Mejorar error handling** para casos de historyId expirado

**Archivo**: `src/services/google/gmailApi.ts`

```typescript
export const getHistory = async (
  accessToken: string,
  startHistoryId: string,
  options: {
    historyTypes?: string[]
    maxResults?: number
    pageToken?: string
  } = {},
) => {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: options.historyTypes?.join(',') || 'messageAdded',
    maxResults: (options.maxResults || 500).toString(),
    ...(options.pageToken && { pageToken: options.pageToken }),
  })

  const response = await fetch(`${GMAIL_API_BASE_URL}/users/me/history?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('HISTORY_ID_INVALID')
    }
    throw new Error(`History API error: ${response.statusText}`)
  }

  return response.json()
}
```

### **3.2 Optimizar `emailSyncService.ts`**

- [ ] **Integrar History API** en flujo principal
- [ ] **Implementar batch processing** para cambios incrementales
- [ ] **Crear función `detectContactInMessage()`** optimizada
- [ ] **Mejorar metadata logging** con tipos de sync

---

## 📋 **FASE 4: Actualización de UI**

### **4.1 Mejorar Indicadores de Progreso**

- [ ] **Modificar `StreamTimeline.tsx`** para mostrar tipo de sync
- [ ] **Actualizar mensajes de loading** para distinguir full vs incremental
- [ ] **Agregar indicator de "checking for new emails"**
- [ ] **Mejorar estimación de tiempo** basada en tipo de sync

```typescript
// En StreamTimeline.tsx
const getSyncStatusMessage = (syncType: 'full' | 'incremental' | 'checking') => {
  switch (syncType) {
    case 'checking':
      return 'Checking for new emails...'
    case 'incremental':
      return 'Downloading new emails...'
    case 'full':
      return 'Downloading complete email history...'
    default:
      return 'Synchronizing emails...'
  }
}
```

### **4.2 Actualizar Componentes de Estado**

- [ ] **Mejorar `stream-view.tsx`** con indicadores específicos
- [ ] **Actualizar tooltips** para explicar tipos de sync
- [ ] **Agregar debug info** (en desarrollo) para historyId
- [ ] **Implementar refresh manual** con opción de force full sync

---

## 📋 **FASE 5: Testing y Validación**

### **5.1 Tests de Funcionalidad**

- [ ] **Test: Primera sincronización** (debe usar full sync)
- [ ] **Test: Segunda sincronización** (debe usar incremental)
- [ ] **Test: HistoryId expirado** (debe hacer fallback a full)
- [ ] **Test: Contacto sin emails nuevos** (debe ser súper rápido)
- [ ] **Test: Contacto con 50+ emails nuevos** (debe procesar todos)

### **5.2 Tests de Performance**

- [ ] **Benchmark: Full sync** vs **Incremental sync**
- [ ] **Medir tiempo de respuesta** para diferentes volúmenes
- [ ] **Test de memoria** durante sync incremental
- [ ] **Test de ancho de banda** (network usage)

### **5.3 Tests de Edge Cases**

- [ ] **Test: Gmail API rate limits** durante incremental sync
- [ ] **Test: Conexión interrumpida** durante History API call
- [ ] **Test: Contacto eliminado** después de última sincronización
- [ ] **Test: Múltiples cuentas Gmail** con diferentes historyIds

---

## 📋 **FASE 6: Monitoreo y Optimización**

### **6.1 Implementar Métricas**

- [ ] **Tracking de tipos de sync** (full vs incremental ratio)
- [ ] **Métricas de performance** (tiempo por tipo de sync)
- [ ] **Error tracking** para History API failures
- [ ] **Usage analytics** para optimization insights

### **6.2 Optimizaciones Adicionales**

- [ ] **Implementar prefetching** para contactos frecuentemente visitados
- [ ] **Cache inteligente** basado en patterns de uso
- [ ] **Batch incremental sync** para múltiples contactos
- [ ] **Background sync scheduler** usando History API

---

## 🎯 **Cronograma de Implementación**

| Fase       | Duración | Entregables                 | Status       |
| ---------- | -------- | --------------------------- | ------------ |
| **Fase 1** | 0.5 día  | Migración DB + Verificación | ⏳ Pendiente |
| **Fase 2** | 1.5 días | Services actualizados       | ⏳ Pendiente |
| **Fase 3** | 1 día    | Gmail API integration       | ⏳ Pendiente |
| **Fase 4** | 0.5 día  | UI improvements             | ⏳ Pendiente |
| **Fase 5** | 1 día    | Testing completo            | ⏳ Pendiente |
| **Fase 6** | 0.5 día  | Monitoreo + Docs            | ⏳ Pendiente |

**Total**: **5 días** para implementación completa

---

## 📊 **Métricas de Éxito**

### **KPIs Principales:**

- [ ] **Performance**: >8x mejora en segunda visita
- [ ] **Ancho de banda**: >90% reducción en datos transferidos
- [ ] **User Experience**: <4 segundos para sincronización incremental
- [ ] **Reliability**: >95% éxito en History API calls
- [ ] **Fallback**: <5% rate de fallback a full sync

### **Métricas Técnicas:**

- [ ] **Time to First Email**: <2 segundos para incremental
- [ ] **Memory Usage**: <20% incremento durante sync
- [ ] **API Calls**: <10 calls para sync incremental típico
- [ ] **Error Rate**: <1% para History API operations

---

## 🛠️ **Comandos de Desarrollo**

### **Setup Inicial:**

```bash
# Ejecutar migración
supabase db push

# Verificar cambios
supabase db diff
```

### **Testing:**

```bash
# Test específico de sync
npm run test -- src/hooks/use-contact-email-sync.test.ts

# Test de integración
npm run test:integration -- gmail-incremental
```

### **Debug:**

```bash
# Habilitar debug de Gmail
VITE_GMAIL_DEBUG=true npm run dev

# Debug específico de History API
VITE_HISTORY_API_DEBUG=true npm run dev
```

---

## 📚 **Referencias Técnicas**

- [Gmail History API Documentation](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list)
- [RFC sobre Incremental Sync](https://developers.google.com/workspace/gmail/api/guides/sync)
- [Best Practices para Performance](https://developers.google.com/workspace/gmail/api/guides/batch)

---

## ✅ **Checklist Final**

### **Pre-Implementación:**

- [ ] Credenciales Gmail configuradas
- [ ] Base de datos Supabase funcionando
- [ ] Tests de integración actuales pasando

### **Post-Implementación:**

- [ ] Migración ejecutada exitosamente
- [ ] Full sync y incremental sync funcionando
- [ ] Fallback automático implementado
- [ ] UI mostrando tipos de sync correctamente
- [ ] Performance mejorado según métricas objetivo
- [ ] Tests de regresión pasando
- [ ] Documentación actualizada

---

**🚀 RESULTADO ESPERADO:**

Sincronización incremental que mejore dramáticamente la experiencia del usuario en visitas subsecuentes al StreamView, reduciendo tiempos de carga de 30 segundos a 3-4 segundos, mientras mantiene toda la funcionalidad existente.
