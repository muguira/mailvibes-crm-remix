import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/hooks/supabase/use-contacts";
import {
  IContactDetails,
  IContactField,
  IContactAddress,
  TUpdateContactInput,
} from "@/types/store/contact-profile";
import {
  CONTACT_PROFILE_VALIDATION_CONFIG,
  CONTACT_PROFILE_ERROR_MESSAGES,
} from "@/constants/store/contact-profile";
import { logger } from "@/utils/logger";
import { withRetrySupabase } from "@/utils/supabaseRetry";

// =============================================
// HELPERS DE TRANSFORMACIÓN DE DATOS
// =============================================

/**
 * Convierte los datos del contacto de Supabase al formato IContactDetails
 */
export const transformContactToDetails = (
  contact: Contact
): IContactDetails => {
  const contactJsonData = contact.data || {};
  const nameParts = contact.name ? contact.name.split(" ") : ["", ""];

  return {
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || "",
    emails: contactJsonData.emails
      ? contactJsonData.emails.map((email: any) => ({
          id: email.id || crypto.randomUUID(),
          value: email.value,
          isPrimary: email.isPrimary || false,
          type: email.type || "work",
        }))
      : [],
    phones: contactJsonData.phones
      ? contactJsonData.phones.map((phone: any) => ({
          id: phone.id || crypto.randomUUID(),
          value: phone.value,
          isPrimary: phone.isPrimary || false,
          type: phone.type || "mobile",
        }))
      : [],
    addresses: contactJsonData.addresses
      ? contactJsonData.addresses.map((address: any) => ({
          id: address.id || crypto.randomUUID(),
          value: address.value,
          isPrimary: address.isPrimary || false,
        }))
      : [],
    linkedin: contactJsonData.linkedin || "",
    company: contact.company || contactJsonData.company || "",
    title: contactJsonData.title || "",
  };
};

/**
 * Convierte IContactDetails al formato para actualizar en Supabase
 */
export const transformDetailsToContactUpdate = (
  contact: Contact,
  details: IContactDetails
) => {
  const fullName = `${details.firstName} ${details.lastName}`.trim();

  const updatedContactData = {
    ...contact.data,
    emails: details.emails.map((email) => ({
      id: email.id,
      value: email.value,
      isPrimary: email.isPrimary,
      type: email.type,
    })),
    phones: details.phones.map((phone) => ({
      id: phone.id,
      value: phone.value,
      isPrimary: phone.isPrimary,
      type: phone.type,
    })),
    addresses: details.addresses.map((address) => ({
      id: address.id,
      value: address.value,
      isPrimary: address.isPrimary,
    })),
    linkedin: details.linkedin,
    title: details.title,
  };

  return {
    name: fullName,
    company: details.company,
    email: details.emails.find((e) => e.isPrimary)?.value || null,
    phone: details.phones.find((p) => p.isPrimary)?.value || null,
    data: updatedContactData,
    updated_at: new Date().toISOString(),
  };
};

// =============================================
// HELPERS DE VALIDACIÓN
// =============================================

/**
 * Valida los detalles del contacto
 */
export const validateContactDetails = (details: IContactDetails): string[] => {
  const errors: string[] = [];

  // Validar nombre
  const fullName = `${details.firstName} ${details.lastName}`.trim();
  if (fullName.length < CONTACT_PROFILE_VALIDATION_CONFIG.MIN_NAME_LENGTH) {
    errors.push("Name is required");
  }
  if (fullName.length > CONTACT_PROFILE_VALIDATION_CONFIG.MAX_NAME_LENGTH) {
    errors.push(
      `Name must be less than ${CONTACT_PROFILE_VALIDATION_CONFIG.MAX_NAME_LENGTH} characters`
    );
  }

  // Validar emails
  details.emails.forEach((email, index) => {
    if (
      email.value &&
      !CONTACT_PROFILE_VALIDATION_CONFIG.EMAIL_REGEX.test(email.value)
    ) {
      errors.push(`Email ${index + 1} is not valid`);
    }
  });

  // Validar teléfonos
  details.phones.forEach((phone, index) => {
    if (
      phone.value &&
      !CONTACT_PROFILE_VALIDATION_CONFIG.PHONE_REGEX.test(phone.value)
    ) {
      errors.push(`Phone ${index + 1} is not valid`);
    }
  });

  // Validar LinkedIn
  if (
    details.linkedin &&
    !CONTACT_PROFILE_VALIDATION_CONFIG.LINKEDIN_REGEX.test(details.linkedin)
  ) {
    errors.push("LinkedIn URL is not valid");
  }

  // Validar título
  if (
    details.title &&
    details.title.length > CONTACT_PROFILE_VALIDATION_CONFIG.MAX_TITLE_LENGTH
  ) {
    errors.push(
      `Title must be less than ${CONTACT_PROFILE_VALIDATION_CONFIG.MAX_TITLE_LENGTH} characters`
    );
  }

  // Validar empresa
  if (
    details.company &&
    details.company.length >
      CONTACT_PROFILE_VALIDATION_CONFIG.MAX_COMPANY_LENGTH
  ) {
    errors.push(
      `Company must be less than ${CONTACT_PROFILE_VALIDATION_CONFIG.MAX_COMPANY_LENGTH} characters`
    );
  }

  return errors;
};

// =============================================
// HELPERS DE UTILIDADES
// =============================================

/**
 * Obtiene el email principal del contacto
 */
export const getPrimaryEmail = (
  emails: IContactField[],
  fallbackEmail?: string | null
): string => {
  const primaryEmail = emails.find((e) => e.isPrimary);
  return primaryEmail
    ? primaryEmail.value
    : emails[0]?.value || fallbackEmail || "";
};

/**
 * Obtiene el teléfono principal del contacto
 */
export const getPrimaryPhone = (
  phones: IContactField[],
  fallbackPhone?: string | null
): string => {
  const primaryPhone = phones.find((p) => p.isPrimary);
  return primaryPhone
    ? primaryPhone.value
    : phones[0]?.value || fallbackPhone || "";
};

/**
 * Obtiene la dirección principal del contacto
 */
export const getPrimaryAddress = (addresses: IContactAddress[]): string => {
  const primaryAddress = addresses.find((a) => a.isPrimary);
  return primaryAddress ? primaryAddress.value : addresses[0]?.value || "";
};

/**
 * Genera un ID único para campos
 */
export const generateFieldId = (): string => {
  return crypto.randomUUID();
};

/**
 * Asegura que al menos un campo sea primario
 */
export const ensurePrimaryField = <T extends { isPrimary: boolean }>(
  fields: T[]
): T[] => {
  if (fields.length === 0) return fields;

  const hasPrimary = fields.some((field) => field.isPrimary);
  if (!hasPrimary) {
    return fields.map((field, index) => ({
      ...field,
      isPrimary: index === 0,
    }));
  }

  return fields;
};

// =============================================
// HELPERS DE OPERACIONES DE BASE DE DATOS
// =============================================

/**
 * Fetch contact from Supabase with retry logic
 */
export const fetchContactFromSupabase = async (
  contactId: string,
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  }
): Promise<Contact> => {
  try {
    const result = await withRetrySupabase<any>(
      async () =>
        await supabase
          .from("contacts")
          .select("*")
          .eq("id", contactId)
          .single(),
      retryConfig
    );

    const { data, error } = result;

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error(CONTACT_PROFILE_ERROR_MESSAGES.CONTACT_NOT_FOUND);
      }
      throw error;
    }

    if (!data) {
      throw new Error(CONTACT_PROFILE_ERROR_MESSAGES.CONTACT_NOT_FOUND);
    }

    // Convert the data to the proper Contact type
    return {
      ...data,
      data:
        typeof data.data === "string"
          ? JSON.parse(data.data)
          : (data.data as Record<string, any>),
    } as Contact;
  } catch (error) {
    logger.error("Error fetching contact from Supabase:", error);
    throw error;
  }
};

/**
 * Update contact in Supabase with retry logic
 */
export const updateContactInSupabase = async (
  contactId: string,
  updateData: any,
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  }
): Promise<Contact> => {
  try {
    const result = await withRetrySupabase<any[]>(
      async () =>
        await supabase
          .from("contacts")
          .update(updateData)
          .eq("id", contactId)
          .select(),
      retryConfig
    );

    const { data, error } = result;

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error(CONTACT_PROFILE_ERROR_MESSAGES.CONTACT_NOT_FOUND);
    }

    return {
      ...data[0],
      data:
        typeof data[0].data === "string"
          ? JSON.parse(data[0].data)
          : (data[0].data as Record<string, any>),
    } as Contact;
  } catch (error) {
    logger.error("Error updating contact in Supabase:", error);
    throw error;
  }
};

// =============================================
// HELPERS DE INTEGRACIÓN CON STORES
// =============================================

/**
 * Sincroniza cambios con el contacts store
 */
export const syncWithContactsStore = async (
  contactId: string,
  updates: any
) => {
  try {
    const { useContactsStore } = await import("@/stores/contactsStore");
    const { updateContact: updateContactInStore } = useContactsStore.getState();

    if (typeof updateContactInStore === "function") {
      updateContactInStore(contactId, updates);
      logger.log(`Updated contact ${contactId} in contacts store`);
    }
  } catch (error) {
    logger.warn("Could not sync with contacts store:", error);
  }
};

/**
 * Sincroniza cambios con mock data (para compatibilidad)
 */
export const syncWithMockData = (contactId: string, updates: any) => {
  try {
    const mockContactsById = (window as any).mockContactsById || {};

    if (mockContactsById[contactId]) {
      mockContactsById[contactId] = {
        ...mockContactsById[contactId],
        ...updates,
        id: contactId,
      };
      logger.log(`Updated contact ${contactId} in mock data`);
    }
  } catch (error) {
    logger.warn("Could not sync with mock data:", error);
  }
};
