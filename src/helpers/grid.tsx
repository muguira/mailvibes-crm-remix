/**
 * @fileoverview Grid helper functions for the CRM application
 * @description This module provides utility functions for managing grid columns,
 * handling data persistence, and configuring default grid settings for the leads grid.
 * It includes functions for saving/loading column configurations, syncing contact data,
 * and extracting dynamic fields from imported data.
 * 
 * @author Mailvibes CRM Team
 * @version 1.0.0
 */

import { Link } from "react-router-dom";
import { DEFAULT_COLUMN_WIDTH } from "@/components/grid-view/grid-constants";
import { Column } from "@/components/grid-view/types";
import { logger } from "@/utils/logger";
import { GridRow } from "@/components/grid-view/types";
import { mockContactsById } from "@/components/stream/sample-data";
import { renderSocialLink } from "@/components/grid-view/RenderSocialLink";

// Note: Manual localStorage functions removed in favor of Zustand persist middleware
// Columns are now automatically persisted via the main store's persist configuration

/**
 * Loads grid column configuration from Supabase user settings
 * @param {any} user - The authenticated user object containing user.id
 * @returns {Promise<Column[] | null>} Promise resolving to column configurations or null
 * @description Attempts to load user-specific column settings from Supabase.
 * Gracefully handles missing tables and 404 errors by returning null.
 * @example
 * ```typescript
 * const user = { id: 'user-123' };
 * const columns = await loadColumnsFromSupabase(user);
 * if (columns) {
 *   setColumns(columns);
 * }
 * ```
 */
export const loadColumnsFromSupabase = async (
  user: any
): Promise<Column[] | null> => {
  if (!user) return null;

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("user_settings" as any) // Type assertion to bypass TypeScript error
      .select("setting_value")
      .eq("user_id", user.id)
      .eq("setting_key", "grid_columns")
      .single();

    if (error) {
      // Return null for 404 errors or table not found errors
      if (
        error.message?.includes("404") ||
        error.code === "PGRST116" ||
        error.code === "42P01"
      ) {
        return null;
      }
      // Only log other errors
      logger.error("Error loading columns from Supabase:", error);
      return null;
    }

    return (data as any)?.setting_value as Column[];
  } catch (error) {
    // Silently fail for 404 errors
    if (!String(error).includes("404") && !String(error).includes("42P01")) {
      logger.error("Error loading columns from Supabase:", error);
    }
    return null;
  }
};

/**
 * Synchronizes a grid row with the mock contacts store for stream view compatibility
 * @param {GridRow} row - The grid row data to sync
 * @description Updates the mockContactsById object with current row data.
 * Creates a new contact entry if it doesn't exist, otherwise updates existing data.
 * This ensures consistency between the grid view and stream view components.
 * @example
 * ```typescript
 * const row = { id: 'contact-123', name: 'John Doe', email: 'john@example.com' };
 * syncContact(row);
 * // Now mockContactsById['contact-123'] contains the updated contact data
 * ```
 */
export const syncContact = (row: GridRow): void => {
  if (!mockContactsById[row.id]) {
    // Create a new contact object if it doesn't exist
    mockContactsById[row.id] = {
      id: row.id,
      name: row.name || "",
      email: row.email || "",
    };
  }

  // Update the contact object with row values
  mockContactsById[row.id] = {
    ...mockContactsById[row.id],
    name: row.name || "",
    email: row.email || "",
    company: row.company || "",
    owner: row.owner || "",
    status: row.status,
    revenue: row.revenue,
    description: row.description || "",
    jobTitle: row.jobTitle || "",
    industry: row.industry || "",
    phone: row.phone || "",
    primaryLocation: row.primaryLocation || "",
    facebook: row.facebook || "",
    instagram: row.instagram || "",
    linkedIn: row.linkedin || "",
    twitter: row.twitter || "",
    website: row.website || "",
    associatedDeals: row.associatedDeals || "",
    source: row.source || "",
  };
};

/**
 * Returns the default column configuration for the leads grid
 * @returns {Column[]} Array of default column configurations
 * @description Provides the standard set of columns for the CRM leads grid including:
 * - Contact name (frozen, with link to stream view)
 * - Lead status (with predefined options and colors)
 * - Company information, contact details
 * - Social media links (with custom renderers)
 * - Revenue (currency type)
 * - Dates (date type)
 * 
 * @example
 * ```typescript
 * const defaultColumns = getDefaultColumns();
 * setColumns(defaultColumns);
 * ```
 */
export const getDefaultColumns = (): Column[] => [
    {
      id: 'name',
      title: 'Contact',
        type: 'text',
      width: 180, // Keep contacts column at 180px
        editable: true,
        frozen: true,
        renderCell: (value, row) => (
          <Link to={`/stream-view/${row.id}`} className="text-primary hover:underline">
            {value}
          </Link>
        ),
      },
    {
      id: 'importListName',
      title: 'List Name',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: false,
      },
      {
        id: 'status',
      title: 'LEAD STATUS',
        type: 'status',
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
        options: ['New', 'In Progress', 'On Hold', 'Closed Won', 'Closed Lost'],
        colors: {
        'New': '#E4E5E8',
        'In Progress': '#DBCDF0',
        'On Hold': '#C6DEF1',
        'Closed Won': '#C9E4DE',
        'Closed Lost': '#F4C6C6',
      },
    },
    {
      id: 'description',
      title: 'Description',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'company',
      title: 'Company',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'jobTitle',
      title: 'Job Title',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'industry',
      title: 'Industry',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'phone',
      title: 'Phone',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'primaryLocation',
      title: 'Primary Location',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'email',
      title: 'Email',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
    {
      id: 'facebook',
      title: 'Facebook',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
      renderCell: renderSocialLink,
    },
    {
      id: 'instagram',
      title: 'Instagram',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
      renderCell: renderSocialLink,
    },
    {
      id: 'linkedin',
      title: 'LinkedIn',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
      renderCell: renderSocialLink,
    },
    {
      id: 'twitter',
      title: 'X',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
      renderCell: renderSocialLink,
    },
    {
      id: 'associatedDeals',
      title: 'Associated Deals',
      type: 'text',
      width: DEFAULT_COLUMN_WIDTH,
      editable: true,
    },
      {
        id: 'revenue',
        title: 'Revenue',
        type: 'currency',
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
      currencyType: 'USD',
      },
      {
        id: 'closeDate',
        title: 'Close Date',
        type: 'date',
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
      },
      {
        id: 'owner',
        title: 'Owner',
        type: 'text',
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
      },
      {
      id: 'source',
      title: 'Source',
        type: 'text',
        width: DEFAULT_COLUMN_WIDTH,
        editable: true,
      },
      {
        id: 'lastContacted',
        title: 'Last Contacted',
        type: 'date',
        width: DEFAULT_COLUMN_WIDTH,
      editable: true
    },
  ];

/**
 * Extracts dynamic field names from imported data rows
 * @param {any[]} rows - Array of data rows to analyze
 * @returns {Set<string>} Set of field names that are not part of the standard columns
 * @description Analyzes imported data to identify custom fields that should be added
 * as dynamic columns. Filters out standard fields and internal system fields.
 * Checks both direct row properties and nested data objects.
 * 
 * @example
 * ```typescript
 * const rows = [
 *   { id: '1', name: 'John', customField1: 'value1', data: { customField2: 'value2' } },
 *   { id: '2', name: 'Jane', customField1: 'value3', data: { customField3: 'value4' } }
 * ];
 * const dynamicFields = extractDynamicFields(rows);
 * // Returns: Set(['customField1', 'customField2', 'customField3'])
 * ```
 */
export const extractDynamicFields = (rows: any[]): Set<string> => {
    const dynamicFields = new Set<string>();
    const standardFields = new Set(getDefaultColumns().map(col => col.id));
    
    rows.forEach(row => {
      // Check fields directly on the row
      Object.keys(row).forEach(key => {
        if (!standardFields.has(key) && key !== 'id' && key !== 'data') {
          dynamicFields.add(key);
        }
      });
      
      // Check fields in the data object
      if (row.data && typeof row.data === 'object') {
        Object.keys(row.data).forEach(key => {
          // Skip internal fields
          if (!key.startsWith('_') && key !== 'account' && key !== 'importedAt') {
            dynamicFields.add(key);
          }
        });
      }
    });
    
    return dynamicFields;
  };

/**
 * Loads opportunities grid column configuration from Supabase user settings
 * @param {any} user - The authenticated user object containing user.id
 * @returns {Promise<Column[] | null>} Promise resolving to column configurations or null
 * @description Attempts to load user-specific opportunities column settings from Supabase.
 * Gracefully handles missing tables and 404 errors by returning null.
 * @example
 * ```typescript
 * const user = { id: 'user-123' };
 * const columns = await loadOpportunitiesColumnsFromSupabase(user);
 * if (columns) {
 *   setColumns(columns);
 * }
 * ```
 */
export const loadOpportunitiesColumnsFromSupabase = async (
  user: any
): Promise<Column[] | null> => {
  if (!user) return null;

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("user_settings" as any) // Type assertion to bypass TypeScript error
      .select("setting_value")
      .eq("user_id", user.id)
      .eq("setting_key", "opportunities_grid_columns")
      .single();

    if (error) {
      // Return null for 404 errors or table not found errors
      if (
        error.message?.includes("404") ||
        error.code === "PGRST116" ||
        error.code === "42P01"
      ) {
        return null;
      }
      // Only log other errors
      logger.error("Error loading opportunities columns from Supabase:", error);
      return null;
    }

    return (data as any)?.setting_value as Column[];
  } catch (error) {
    // Silently fail for 404 errors
    if (!String(error).includes("404") && !String(error).includes("42P01")) {
      logger.error("Error loading opportunities columns from Supabase:", error);
    }
    return null;
  }
};

/**
 * Loads opportunities hidden columns from Supabase user settings
 * @param {any} user - The authenticated user object containing user.id
 * @returns {Promise<Column[] | null>} Promise resolving to hidden column configurations or null
 */
export const loadOpportunitiesHiddenColumnsFromSupabase = async (
  user: any
): Promise<Column[] | null> => {
  if (!user) return null;

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("user_settings" as any)
      .select("setting_value")
      .eq("user_id", user.id)
      .eq("setting_key", "opportunities_hidden_columns")
      .single();

    if (error) {
      if (
        error.message?.includes("404") ||
        error.code === "PGRST116" ||
        error.code === "42P01"
      ) {
        return null;
      }
      logger.error("Error loading opportunities hidden columns from Supabase:", error);
      return null;
    }

    return (data as any)?.setting_value as Column[];
  } catch (error) {
    if (!String(error).includes("404") && !String(error).includes("42P01")) {
      logger.error("Error loading opportunities hidden columns from Supabase:", error);
    }
    return null;
  }
};

/**
 * Saves opportunities grid columns to Supabase user settings
 * @param {Column[]} columns - The column configurations to save
 * @param {any} user - The authenticated user object containing user.id
 * @returns {Promise<void>}
 */
export const saveOpportunitiesColumnsToSupabase = async (
  columns: Column[],
  user: any
): Promise<void> => {
  if (!user) return;

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.from('user_settings' as any).upsert(
      {
        user_id: user.id,
        setting_key: 'opportunities_grid_columns',
        setting_value: columns,
      },
      {
        onConflict: 'user_id,setting_key',
      },
    );

    if (error) {
      logger.error('Supabase opportunities columns save error:', error);
      throw new Error(`Supabase sync failed: ${error.message}`);
    } else {
      logger.log('✅ Opportunities columns synced to Supabase successfully');
    }
  } catch (error) {
    logger.error('Error saving opportunities columns to Supabase:', error);
    throw error;
  }
};

/**
 * Saves opportunities hidden columns to Supabase user settings
 * @param {Column[]} hiddenColumns - The hidden column configurations to save
 * @param {any} user - The authenticated user object containing user.id
 * @returns {Promise<void>}
 */
export const saveOpportunitiesHiddenColumnsToSupabase = async (
  hiddenColumns: Column[],
  user: any
): Promise<void> => {
  if (!user) return;

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.from('user_settings' as any).upsert(
      {
        user_id: user.id,
        setting_key: 'opportunities_hidden_columns',
        setting_value: hiddenColumns,
      },
      {
        onConflict: 'user_id,setting_key',
      },
    );

    if (error) {
      logger.error('Supabase opportunities hidden columns save error:', error);
      throw new Error(`Supabase sync failed: ${error.message}`);
    } else {
      logger.log('✅ Opportunities hidden columns synced to Supabase successfully');
    }
  } catch (error) {
    logger.error('Error saving opportunities hidden columns to Supabase:', error);
    throw error;
  }
};