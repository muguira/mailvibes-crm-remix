import { supabase } from "@/integrations/supabase/client";
import { ParsedCsvResult } from "@/utils/parseCsv";
import { FieldMapping, mapColumnsToContact } from "@/utils/mapColumnsToContact";
import {
  AccountFieldMapping,
  mapColumnsToAccount,
} from "@/utils/mapColumnsToAccount";
import { ListFieldDefinition } from "@/utils/buildFieldDefinitions";
import { logger } from "@/utils/logger";

interface ImportResult {
  contactsCreated: number;
  contactsSkipped: number;
  contactsUpdated: number;
  accountsCreated: number;
  accountsSkipped: number;
  listRowsCreated: number;
  listId: string | null;
  listName: string;
  errors: string[];
}

interface ProcessedRow {
  contact: any;
  account: any;
  listFields: Record<string, any>;
  importOrder: number;
}

const BATCH_SIZE = 100;

export async function importCsvData(
  parsedData: ParsedCsvResult,
  contactFieldMappings: FieldMapping[],
  accountFieldMappings: AccountFieldMapping[],
  listFieldDefinitions: ListFieldDefinition[],
  listName: string,
  relationType: "contacts" | "accounts",
  userId: string,
  onProgress?: (progress: number) => void,
  multipleRowsAction: "multiple" | "merge" = "multiple"
): Promise<ImportResult> {
  const result: ImportResult = {
    contactsCreated: 0,
    contactsSkipped: 0,
    contactsUpdated: 0,
    accountsCreated: 0,
    accountsSkipped: 0,
    listRowsCreated: 0,
    listId: null,
    listName: listName,
    errors: [],
  };

  try {
    // Generate a proper UUID for the list
    const listId = crypto.randomUUID();
    result.listId = listId;

    // Process rows in batches
    const totalRows = parsedData.rows.length;
    const batches = Math.ceil(totalRows / BATCH_SIZE);
    let totalProcessed = 0;
    let globalRowIndex = 0; // Track the absolute row position across all batches

    for (let i = 0; i < batches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, totalRows);
      const batchRows = parsedData.rows.slice(start, end);

      // Process batch with row indices
      const processedRows = batchRows.map((row, batchIndex) => {
        const absoluteRowIndex = globalRowIndex + batchIndex;
        return processRow(
          row,
          contactFieldMappings,
          accountFieldMappings,
          listFieldDefinitions,
          absoluteRowIndex // Pass the absolute row index
        );
      });

      // Separate contacts by whether they have emails
      const contactsWithEmail = processedRows
        .filter((row) => row.contact && row.contact.email)
        .map((row, index) => {
          const contact = row.contact;

          // Build the data object with all imported fields
          const dataObject: Record<string, any> = {
            // Add the list name so we can filter by it
            importListName: listName,
            importedAt: new Date().toISOString(),
            importOrder: row.importOrder, // Add import order to preserve CSV row order

            // Store contact properties that don't have direct columns
            address: contact.address || null,
            linkedin: contact.linkedin || null,
            facebook: contact.facebook || null,

            // Store all list fields
            ...row.listFields,

            // Store account information if available
            account: row.account || null,
          };

          // Map the contact fields properly
          return {
            id: crypto.randomUUID(),
            user_id: userId,
            list_id: listId,
            name:
              contact.name ||
              (contact.firstName && contact.lastName
                ? `${contact.firstName} ${contact.lastName}`.trim()
                : contact.firstName || contact.lastName || "Untitled Contact"),
            email: contact.email,
            phone: contact.phone || null,
            company: row.account?.name || null,
            status: "New",
            data: dataObject,
            // Set created_at based on import order to maintain CSV row order
            created_at: new Date(Date.now() + row.importOrder).toISOString(),
          };
        });

      // Contacts without email (can be inserted directly)
      const contactsWithoutEmail = processedRows
        .filter((row) => row.contact && !row.contact.email && row.contact.name)
        .map((row, index) => {
          const contact = row.contact;

          // Build the data object with all imported fields
          const dataObject: Record<string, any> = {
            // Add the list name so we can filter by it
            importListName: listName,
            importedAt: new Date().toISOString(),
            importOrder: row.importOrder, // Add import order to preserve CSV row order

            // Store contact properties that don't have direct columns
            address: contact.address || null,
            linkedin: contact.linkedin || null,
            facebook: contact.facebook || null,

            // Store all list fields
            ...row.listFields,

            // Store account information if available
            account: row.account || null,
          };

          // Map the contact fields properly
          return {
            id: crypto.randomUUID(),
            user_id: userId,
            list_id: listId,
            name:
              contact.name ||
              (contact.firstName && contact.lastName
                ? `${contact.firstName} ${contact.lastName}`.trim()
                : contact.firstName || contact.lastName || "Untitled Contact"),
            email: null,
            phone: contact.phone || null,
            company: row.account?.name || null,
            status: "New",
            data: dataObject,
            // Set created_at based on import order to maintain CSV row order
            created_at: new Date(Date.now() + row.importOrder).toISOString(),
          };
        });

      // Handle contacts with emails using upsert
      if (contactsWithEmail.length > 0) {
        try {
          // First check which emails already exist
          const emails = contactsWithEmail.map((c) => c.email);
          const { data: existingContacts } = await supabase
            .from("contacts")
            .select("email")
            .eq("user_id", userId)
            .in("email", emails);

          const existingEmails = new Set(
            existingContacts?.map((c) => c.email) || []
          );

          // Separate new vs existing contacts
          const newContacts = contactsWithEmail.filter(
            (c) => !existingEmails.has(c.email)
          );
          const existingContactsToUpdate = contactsWithEmail.filter((c) =>
            existingEmails.has(c.email)
          );

          // Insert new contacts
          if (newContacts.length > 0) {
            const { data: insertedContacts, error: insertError } =
              await supabase.from("contacts").insert(newContacts).select();

            if (insertError) {
              logger.error("Insert error:", insertError);
              result.errors.push(`Insert error: ${insertError.message}`);
            } else {
              result.contactsCreated += insertedContacts?.length || 0;
              result.listRowsCreated += insertedContacts?.length || 0;
            }
          }

          // Update existing contacts (merge data)
          for (const contact of existingContactsToUpdate) {
            const { error: updateError } = await supabase
              .from("contacts")
              .update({
                list_id: listId,
                name: contact.name,
                phone: contact.phone,
                company: contact.company,
                status: contact.status,
                data: contact.data,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId)
              .eq("email", contact.email);

            if (updateError) {
              logger.error(
                "Update error for email",
                contact.email,
                ":",
                updateError
              );
              result.errors.push(
                `Failed to update contact with email ${contact.email}`
              );
            } else {
              result.contactsUpdated += 1;
              result.listRowsCreated += 1;
            }
          }
        } catch (error: any) {
          logger.error("Error processing contacts with emails:", error);
          result.errors.push(`Batch processing error: ${error.message}`);
        }
      }

      // Insert contacts without emails (no conflict possible)
      if (contactsWithoutEmail.length > 0) {
        const { data: insertedContacts, error: insertError } = await supabase
          .from("contacts")
          .insert(contactsWithoutEmail)
          .select();

        if (insertError) {
          logger.error("Insert error for contacts without email:", insertError);
          result.errors.push(`Insert error: ${insertError.message}`);
        } else {
          result.contactsCreated += insertedContacts?.length || 0;
          result.listRowsCreated += insertedContacts?.length || 0;
        }
      }

      // Update global row index for next batch
      globalRowIndex += batchRows.length;

      // Update progress based on rows processed, not batches
      totalProcessed += batchRows.length;
      if (onProgress) {
        const progress = Math.round((totalProcessed / totalRows) * 100);
        onProgress(progress);
      }
    }

    // Calculate skipped records
    result.contactsSkipped =
      totalRows - result.contactsCreated - result.contactsUpdated;
  } catch (error: any) {
    logger.error("Import error:", error);
    result.errors.push(error.message);
  }

  return result;
}

function processRow(
  row: Record<string, string>,
  contactFieldMappings: FieldMapping[],
  accountFieldMappings: AccountFieldMapping[],
  listFieldDefinitions: ListFieldDefinition[],
  rowIndex: number // Add row index parameter
): ProcessedRow {
  // Map contact fields
  const contact = mapColumnsToContact(row, contactFieldMappings);

  // Map account fields
  const account = mapColumnsToAccount(row, accountFieldMappings);

  // Map list fields
  const listFields: Record<string, any> = {};
  listFieldDefinitions.forEach((field) => {
    if (field.csvField && row[field.csvField] !== undefined) {
      listFields[field.fieldName] = convertFieldValue(
        row[field.csvField],
        field.type
      );
    }
  });

  return { contact, account, listFields, importOrder: rowIndex };
}

function convertFieldValue(value: string, type: string): any {
  if (!value || value.trim() === "") return null;

  switch (type) {
    case "number":
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    case "date":
      // Expect MM/DD/YYYY format
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString();
    case "list":
      // Handle comma-separated lists
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    default:
      return value;
  }
}

// Validation function to check data before import
export function validateImportData(
  parsedData: ParsedCsvResult,
  contactFieldMappings: FieldMapping[],
  listFieldDefinitions: ListFieldDefinition[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if required fields are mapped
  const hasNameMapping = contactFieldMappings.some(
    (m) => m.contactProperty === "name"
  );
  const hasEmailMapping = contactFieldMappings.some(
    (m) => m.contactProperty === "email"
  );

  if (!hasNameMapping && !hasEmailMapping) {
    errors.push("Either Name or Email must be mapped for contacts");
  }

  // Check if relationship name is mapped
  const relationshipField = listFieldDefinitions.find((f) => f.isRequired);
  if (!relationshipField || !relationshipField.csvField) {
    errors.push("Relationship Name must be mapped");
  }

  // Check for empty data
  if (parsedData.rows.length === 0) {
    errors.push("No data rows found in CSV");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
