import { supabase } from "../../integrations/supabase/client";
import { getValidToken } from "./tokenService";
import { getRecentContactEmails } from "./gmailApi";
import { getContactsCount } from "./peopleApi";
import { logger } from "@/utils/logger";

/**
 * Diagnóstico completo de tokens para contactos vs correos
 */
export async function diagnoseTokenIssues(userId: string, email: string) {
  logger.info("=== DIAGNÓSTICO DE TOKENS ===");
  logger.info(`Usuario: ${userId}`);
  logger.info(`Email: ${email}`);

  try {
    // 1. Verificar estado de la cuenta en la base de datos
    const { data: emailAccount, error: accountError } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("email", email)
      .single();

    if (accountError || !emailAccount) {
      logger.error("❌ Cuenta de email no encontrada:", accountError);
      return;
    }

    logger.info("✅ Cuenta de email encontrada:");
    logger.info(`  - Sync enabled: ${emailAccount.sync_enabled}`);
    logger.info(`  - Last sync: ${emailAccount.last_sync_at}`);
    logger.info(`  - Last sync status: ${emailAccount.last_sync_status}`);
    logger.info(`  - Last sync error: ${emailAccount.last_sync_error}`);

    // 2. Verificar tokens en la base de datos
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("user_id", userId)
      .eq("email_account_id", emailAccount.id)
      .single();

    if (tokenError || !tokenRecord) {
      logger.error("❌ Token no encontrado:", tokenError);
      return;
    }

    const expiresAt = new Date(tokenRecord.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();

    logger.info("✅ Token encontrado:");
    logger.info(`  - Expires at: ${expiresAt.toISOString()}`);
    logger.info(
      `  - Time until expiry: ${Math.round(
        timeUntilExpiry / 1000 / 60
      )} minutes`
    );
    logger.info(`  - Has refresh token: ${!!tokenRecord.refresh_token}`);
    logger.info(`  - Token expired: ${timeUntilExpiry <= 0}`);

    // 3. Probar obtener token válido
    logger.info("\n=== PROBANDO OBTENER TOKEN VÁLIDO ===");
    const validToken = await getValidToken(userId, email);

    if (!validToken) {
      logger.error("❌ No se pudo obtener token válido");
      return;
    }

    logger.info("✅ Token válido obtenido");

    // 4. Probar API de contactos
    logger.info("\n=== PROBANDO API DE CONTACTOS ===");
    try {
      const contactsCount = await getContactsCount(validToken);
      logger.info(`✅ Contactos API exitosa: ${contactsCount} contactos`);
    } catch (contactsError) {
      logger.error("❌ Error en API de contactos:", contactsError);

      // Verificar si es error de token
      if (contactsError instanceof Error) {
        if (
          contactsError.message.includes("401") ||
          contactsError.message.includes("unauthorized")
        ) {
          logger.error(
            "🔍 Error de autorización en API de contactos - token inválido"
          );
        } else if (
          contactsError.message.includes("403") ||
          contactsError.message.includes("forbidden")
        ) {
          logger.error(
            "🔍 Error de permisos en API de contactos - scopes insuficientes"
          );
        }
      }
    }

    // 5. Probar API de correos
    logger.info("\n=== PROBANDO API DE CORREOS ===");
    try {
      const emailsResponse = await getRecentContactEmails(
        validToken,
        "test@example.com",
        1
      );
      logger.info(
        `✅ Correos API exitosa: ${emailsResponse.emails.length} emails encontrados`
      );
    } catch (emailsError) {
      logger.error("❌ Error en API de correos:", emailsError);

      // Verificar si es error de token
      if (emailsError instanceof Error) {
        if (
          emailsError.message.includes("401") ||
          emailsError.message.includes("unauthorized")
        ) {
          logger.error(
            "🔍 Error de autorización en API de correos - token inválido"
          );
        } else if (
          emailsError.message.includes("403") ||
          emailsError.message.includes("forbidden")
        ) {
          logger.error(
            "🔍 Error de permisos en API de correos - scopes insuficientes"
          );
        }
      }
    }

    // 6. Verificar scopes del token
    logger.info("\n=== VERIFICANDO SCOPES ===");
    try {
      const tokenInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${validToken}`
      );
      const tokenInfo = await tokenInfoResponse.json();

      if (tokenInfoResponse.ok) {
        logger.info("✅ Token info obtenida:");
        logger.info(`  - Scopes: ${tokenInfo.scope}`);
        logger.info(`  - Expires in: ${tokenInfo.expires_in} seconds`);

        // Verificar scopes específicos
        const scopes = tokenInfo.scope?.split(" ") || [];
        const requiredScopes = [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/contacts.readonly",
        ];

        requiredScopes.forEach((scope) => {
          if (scopes.includes(scope)) {
            logger.info(`  ✅ Scope presente: ${scope}`);
          } else {
            logger.error(`  ❌ Scope faltante: ${scope}`);
          }
        });
      } else {
        logger.error("❌ Error obteniendo token info:", tokenInfo);
      }
    } catch (tokenInfoError) {
      logger.error("❌ Error verificando scopes:", tokenInfoError);
    }

    // 7. Probar refresh de token
    logger.info("\n=== PROBANDO REFRESH DE TOKEN ===");
    try {
      const refreshResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-refresh-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
          },
          body: JSON.stringify({
            user_id: userId,
            email: email,
          }),
        }
      );

      const refreshData = await refreshResponse.json();

      if (refreshResponse.ok && refreshData.success) {
        logger.info("✅ Token refresh exitoso");
        logger.info(
          `  - Nuevo token obtenido: ${refreshData.access_token ? "Sí" : "No"}`
        );
      } else {
        logger.error("❌ Error en token refresh:", refreshData);
      }
    } catch (refreshError) {
      logger.error("❌ Error probando refresh:", refreshError);
    }
  } catch (error) {
    logger.error("❌ Error general en diagnóstico:", error);
  }
}

/**
 * Función helper para ejecutar diagnóstico desde la consola
 */
export async function runDiagnostics() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.error("❌ Usuario no autenticado");
    return;
  }

  // Obtener primera cuenta de Gmail
  const { data: emailAccounts } = await supabase
    .from("email_accounts")
    .select("email")
    .eq("user_id", user.id)
    .eq("provider", "gmail")
    .limit(1);

  if (!emailAccounts || emailAccounts.length === 0) {
    logger.error("❌ No hay cuentas de Gmail conectadas");
    return;
  }

  await diagnoseTokenIssues(user.id, emailAccounts[0].email);
}

// Exportar para uso en consola del navegador
(window as any).runGmailDiagnostics = runDiagnostics;

/**
 * Diagnóstico específico para el flujo de correos en timeline
 */
export async function diagnoseEmailTimelineFlow(contactEmail: string) {
  logger.info("=== DIAGNÓSTICO ESPECÍFICO DE TIMELINE DE CORREOS ===");
  logger.info(`Contact Email: ${contactEmail}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.error("❌ Usuario no autenticado");
    return;
  }

  try {
    // 1. Simular el flujo exacto que usa useHybridContactEmails
    logger.info("\n=== SIMULANDO FLUJO DE useHybridContactEmails ===");

    // Obtener cuentas conectadas
    const { data: emailAccounts } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .eq("sync_enabled", true);

    if (!emailAccounts || emailAccounts.length === 0) {
      logger.error("❌ No hay cuentas de Gmail habilitadas");
      return;
    }

    logger.info(`✅ Cuentas Gmail encontradas: ${emailAccounts.length}`);

    // 2. Probar obtener token usando el mismo método que el store
    logger.info("\n=== PROBANDO OBTENER TOKEN COMO EL STORE ===");
    const firstAccount = emailAccounts[0];
    const token = await getValidToken(user.id, firstAccount.email);

    if (!token) {
      logger.error("❌ No se pudo obtener token válido");
      return;
    }

    logger.info("✅ Token obtenido exitosamente");

    // 2.5. NUEVO: Inspeccionar estructura de emails existentes
    logger.info("\n=== INSPECCIONANDO ESTRUCTURA DE EMAILS EN BD ===");
    const { data: allEmails, error: allEmailsError } = await supabase
      .from("emails")
      .select("id, from_email, to_emails, subject, date")
      .eq("user_id", user.id)
      .eq("email_account_id", firstAccount.id)
      .limit(5);

    if (allEmailsError) {
      logger.error(
        "❌ Error obteniendo emails para inspección:",
        allEmailsError
      );
    } else {
      logger.info(
        `✅ Emails encontrados para inspección: ${allEmails?.length || 0}`
      );
      if (allEmails && allEmails.length > 0) {
        allEmails.forEach((email, index) => {
          logger.info(`  Email ${index + 1}:`);
          logger.info(`    - ID: ${email.id}`);
          logger.info(`    - From: ${email.from_email}`);
          logger.info(`    - To (raw): ${JSON.stringify(email.to_emails)}`);
          logger.info(`    - To (type): ${typeof email.to_emails}`);
          logger.info(`    - Subject: ${email.subject}`);
          logger.info(`    - Date: ${email.date}`);
        });
      }
    }

    // 3. Probar búsqueda de emails desde BD (como useHybridContactEmails)
    logger.info("\n=== PROBANDO BÚSQUEDA EN BASE DE DATOS ===");
    // Query all emails and filter locally to avoid JSONB operator issues
    const { data: allDbEmails, error: dbError } = await supabase
      .from("emails")
      .select("*")
      .eq("user_id", user.id)
      .eq("email_account_id", firstAccount.id)
      .order("date", { ascending: false })
      .limit(100); // Get more to filter locally

    // Filter emails locally to find those related to the contact
    const dbEmails = (allDbEmails || [])
      .filter((email) => {
        // Check if contact is in from_email
        if (email.from_email === contactEmail) {
          return true;
        }

        // Check if contact is in to_emails (JSON string)
        if (email.to_emails) {
          const toEmailsStr =
            typeof email.to_emails === "string"
              ? email.to_emails
              : JSON.stringify(email.to_emails);
          return toEmailsStr.includes(contactEmail);
        }

        return false;
      })
      .slice(0, 20);

    if (dbError) {
      logger.error("❌ Error consultando BD:", dbError);
    } else {
      logger.info(`✅ Emails en BD: ${dbEmails?.length || 0}`);
      if (dbEmails && dbEmails.length > 0) {
        logger.info(
          `  - Ejemplo: ${dbEmails[0].subject} (${dbEmails[0].date})`
        );
      }
    }

    // 4. Probar API de Gmail con el email específico
    logger.info("\n=== PROBANDO API DE GMAIL CON EMAIL ESPECÍFICO ===");
    try {
      const apiResponse = await getRecentContactEmails(token, contactEmail, 20);
      logger.info(
        `✅ API Gmail: ${apiResponse.emails.length} emails encontrados`
      );

      if (apiResponse.emails.length > 0) {
        logger.info(
          `  - Ejemplo: ${apiResponse.emails[0].subject} (${apiResponse.emails[0].date})`
        );

        // Verificar si los emails tienen el formato correcto
        const firstEmail = apiResponse.emails[0];
        logger.info("  - Estructura del email:");
        logger.info(`    * ID: ${firstEmail.id}`);
        logger.info(`    * From: ${firstEmail.from}`);
        logger.info(`    * To: ${firstEmail.to}`);
        logger.info(`    * Subject: ${firstEmail.subject}`);
        logger.info(`    * Date: ${firstEmail.date}`);
      }
    } catch (apiError) {
      logger.error("❌ Error en API de Gmail:", apiError);
    }

    // 5. Verificar sincronización de emails
    logger.info("\n=== VERIFICANDO ESTADO DE SINCRONIZACIÓN ===");
    logger.info(`  - Last sync: ${firstAccount.last_sync_at}`);
    logger.info(`  - Last sync status: ${firstAccount.last_sync_status}`);
    logger.info(`  - Last sync error: ${firstAccount.last_sync_error}`);

    // 6. Probar el servicio de sincronización
    logger.info("\n=== PROBANDO SERVICIO DE SINCRONIZACIÓN ===");
    try {
      const { createEmailSyncService } = await import("./emailSyncService");
      const syncService = await createEmailSyncService(
        user.id,
        firstAccount.email
      );

      if (!syncService) {
        logger.error("❌ No se pudo crear el servicio de sincronización");
        return;
      }

      const syncResult = await syncService.syncContactEmails(contactEmail, {
        maxEmails: 5,
        forceFullSync: false,
      });

      logger.info("✅ Sincronización exitosa:");
      logger.info(`  - Emails sincronizados: ${syncResult.emailsSynced}`);
      logger.info(`  - Emails creados: ${syncResult.emailsCreated}`);
      logger.info(`  - Emails actualizados: ${syncResult.emailsUpdated}`);
    } catch (syncError) {
      logger.error("❌ Error en sincronización:", syncError);
    }

    // 7. Verificar después de sincronización
    logger.info("\n=== VERIFICANDO BD DESPUÉS DE SINCRONIZACIÓN ===");
    // Query all emails and filter locally to avoid JSONB operator issues
    const { data: allDbEmailsAfter } = await supabase
      .from("emails")
      .select("*")
      .eq("user_id", user.id)
      .eq("email_account_id", firstAccount.id)
      .order("date", { ascending: false })
      .limit(100); // Get more to filter locally

    // Filter emails locally to find those related to the contact
    const dbEmailsAfter = (allDbEmailsAfter || [])
      .filter((email) => {
        // Check if contact is in from_email
        if (email.from_email === contactEmail) {
          return true;
        }

        // Check if contact is in to_emails (JSON string)
        if (email.to_emails) {
          const toEmailsStr =
            typeof email.to_emails === "string"
              ? email.to_emails
              : JSON.stringify(email.to_emails);
          return toEmailsStr.includes(contactEmail);
        }

        return false;
      })
      .slice(0, 20);

    logger.info(
      `✅ Emails en BD después de sync: ${dbEmailsAfter?.length || 0}`
    );
  } catch (error) {
    logger.error("❌ Error general en diagnóstico de timeline:", error);
  }
}

// Exportar para uso en consola
(window as any).diagnoseEmailTimeline = diagnoseEmailTimelineFlow;
