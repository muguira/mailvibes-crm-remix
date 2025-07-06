// @ts-nocheck
import { useAuth } from "@/components/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { v4 as uuidv4 } from "uuid";
import { GridRow } from "@/components/grid-view/types";
import { LEADS_STORAGE_KEY } from "@/constants/grid";
import { useState, useEffect, useCallback } from "react";
import { LeadContact } from "@/components/stream/sample-data";
import { mockContactsById } from "@/components/stream/sample-data";
import { updateContact } from "@/helpers/updateContact";
import { withRetrySupabase } from "@/utils/supabaseRetry";
import { logger } from "@/utils/logger";
import { useContactsStore } from "@/stores/contactsStore";

/**
 * Helper function to transform row IDs to database-compatible format
 * - Converts "lead-XXX" format to integer if possible
 * - Falls back to original ID if can't be transformed
 */
function transformRowId(id: string): string | number {
  // If ID has format "lead-XXX", try to extract just the number
  if (typeof id === "string" && id.startsWith("lead-")) {
    try {
      // Extract the number part and convert to integer
      const numericPart = id.replace("lead-", "");
      // Remove leading zeros from numeric part (e.g., '007' becomes '7')
      const cleanNumeric = numericPart.replace(/^0+/, "");
      return parseInt(cleanNumeric, 10);
    } catch (e) {
      logger.warn(`Could not transform row ID ${id} to number:`, e);
    }
  }
  // Return original ID as fallback
  return id;
}

/**
 * Helper function to check if a row exists in the database
 */
async function checkRowExistsInDb(userId: string, rowId: string | number) {
  try {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", userId)
      .eq("id", rowId)
      .single();

    return !!data; // Return true if data exists
  } catch (e) {
    // If there's an error, assume row doesn't exist
    return false;
  }
}

// Add a utility function to properly sort rows by ID
function sortRowsByIdAscending(rows: GridRow[]): GridRow[] {
  return [...rows].sort((a, b) => {
    // Extract numeric parts of row IDs for proper numeric sorting
    const getNumericId = (id: string): number => {
      const match = id.match(/lead-(\d+)/);
      // Extract numeric part, or use a very high number for non-numeric IDs
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    };

    const idA = getNumericId(a.id);
    const idB = getNumericId(b.id);

    // Sort by ID in ascending order (lowest first)
    return idA - idB;
  });
}

// Add a utility function to get proper initial data
const getProperOrderedData = (rawRows: GridRow[]): GridRow[] => {
  if (!rawRows || rawRows.length === 0) return [];

  // Strip any test/temporary data that might cause flashing
  const filteredRows = rawRows.filter(
    (row) => row.id !== "pedro" && !row.id.includes("test-")
  );

  // Sort rows by ID in ascending order
  return sortRowsByIdAscending(filteredRows);
};

// Constants
export const PAGE_SIZE = 10;

// Cache for storing pages of data
const pageCache = new Map<string, { data: LeadContact[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Local storage fallback functions
const loadRowsFromLocal = (): LeadContact[] => {
  try {
    const savedRows = localStorage.getItem(LEADS_STORAGE_KEY);
    if (savedRows) {
      return JSON.parse(savedRows);
    }
  } catch (error) {
    logger.error("Failed to load rows from localStorage:", error);
  }
  return [];
};

const saveRowsToLocal = (rows: LeadContact[]): void => {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(rows));
  } catch (error) {
    logger.error("Failed to save rows to localStorage:", error);
  }
};

// Add a Set to track pages being fetched to prevent duplicate requests
const fetchingPages = new Set<string>();

/**
 * Hook for managing lead rows with Supabase persistence
 * Falls back to localStorage when not authenticated
 */
export function useLeadsRows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<LeadContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [totalCount, setTotalCount] = useState(0); // Add state for total count
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Update mockContactsById whenever rows change
  useEffect(() => {
    rows.forEach((row) => {
      mockContactsById[row.id] = row;
    });
  }, [rows]);

  // Function to get cache key
  const getCacheKey = (page: number, pageSize: number) => {
    return `${user?.id}-page-${page}-size-${pageSize}`;
  };

  // Function to check if cache is valid
  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  // Function to fetch data from Supabase - only loads what's needed for current page
  const fetchLeadsRows = async (
    page: number = 1,
    pageSize: number = 50,
    forceRefresh: boolean = false
  ) => {
    // Check cache first if not forcing refresh
    const cacheKey = getCacheKey(page, pageSize);

    // Prevent duplicate fetches for the same page
    if (fetchingPages.has(cacheKey) && !forceRefresh) {
      logger.log(`Already fetching page ${page}, skipping duplicate request`);
      return { totalCount: totalCount };
    }

    const cached = pageCache.get(cacheKey);

    if (!forceRefresh && cached && isCacheValid(cached.timestamp)) {
      logger.log(`Using cached data for page ${page}`);
      setRows(cached.data);
      setLoading(false);
      return { totalCount: totalCount || cached.data.length };
    }

    // Mark this page as being fetched
    fetchingPages.add(cacheKey);

    // Show loading only if we don't have any data yet
    if (rows.length === 0 || forceRefresh) {
      setLoading(true);
    }

    try {
      // First try to fetch from Supabase using contacts table
      if (user) {
        // Calculate offset for pagination
        const offset = (page - 1) * pageSize;

        // Use smaller page size for faster initial load
        const actualPageSize = pageSize;

        // Fetch only the contacts for the current page
        let query = supabase
          .from("contacts")
          .select(
            "id, name, email, phone, company, status, user_id, data, created_at, updated_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }) // Most recent first
          .range(offset, offset + actualPageSize - 1); // Use range for pagination

        // Start both queries in parallel for better performance
        const [dataResult, countResult] = await Promise.all([
          query,
          supabase
            .from("contacts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        const { data, error } = dataResult;
        const { count } = countResult;

        if (error) {
          logger.error("SUPABASE ERROR:", error);
          throw error;
        }

        logger.log(
          `Loaded page ${page} with ${data?.length || 0} contacts (Total: ${
            count || 0
          })`
        );

        // Store the total count
        setTotalCount(count || 0);
        setIsInitialLoad(false);

        // If we have data in Supabase, use it
        if (data && data.length > 0) {
          // Convert contacts to LeadContact format - use database IDs directly
          const processedRows = data.map((contact) => {
            const leadContact: LeadContact = {
              id: contact.id, // Use the actual database ID - no mapping needed
              name: contact.name,
              email: contact.email || "",
              phone: contact.phone || "",
              company: contact.company || "",
              status: contact.status || "",
              // Extract importListName from data field if it exists
              importListName: contact.data?.importListName || "",
              // Extract importOrder to preserve CSV row order
              importOrder: contact.data?.importOrder,
              // Spread the rest of the data field
              ...(contact.data || {}),
            };
            return leadContact;
          });

          // Sort the rows properly:
          // 1. Imported contacts (with importListName) come first
          // 2. Within imported lists, sort by importOrder
          // 3. Non-imported contacts come after, sorted by creation date
          const sortedRows = processedRows.sort((a, b) => {
            const aImportList = a.importListName || "";
            const bImportList = b.importListName || "";

            // If one has import list and other doesn't, imported one comes first
            if (aImportList && !bImportList) return -1;
            if (!aImportList && bImportList) return 1;

            // Both have import lists - sort by list name first
            if (aImportList && bImportList && aImportList !== bImportList) {
              return aImportList.localeCompare(bImportList);
            }

            // Same import list (or both have no list) - check import order
            const aImportOrder = a.importOrder;
            const bImportOrder = b.importOrder;

            // If both have import order, use that (ascending - first row first)
            if (aImportOrder !== undefined && bImportOrder !== undefined) {
              return aImportOrder - bImportOrder;
            }

            // If only one has import order, it goes first
            if (aImportOrder !== undefined) return -1;
            if (bImportOrder !== undefined) return 1;

            // Neither has import order - they're already sorted by created_at from the query
            return 0;
          });

          setRows(sortedRows);

          // Cache the data in memory
          pageCache.set(cacheKey, { data: sortedRows, timestamp: Date.now() });

          // Also cache first page to localStorage for instant load next time
          if (page === 1) {
            try {
              localStorage.setItem(
                "contacts-first-page",
                JSON.stringify({
                  data: sortedRows,
                  totalCount: count,
                  timestamp: Date.now(),
                })
              );
            } catch (e) {
              logger.warn("Failed to cache to localStorage:", e);
            }
          }

          // Keep mockContactsById in sync (but only for loaded contacts)
          sortedRows.forEach((row) => {
            mockContactsById[row.id] = row;
          });

          // Return the total count for pagination controls
          return { totalCount: count || 0 };
        } else {
          // Start with an empty array - don't generate dummy data
          setRows([]);

          // Clear mockContactsById to ensure no dummy data
          Object.keys(mockContactsById).forEach((key) => {
            delete mockContactsById[key];
          });

          return { totalCount: 0 };
        }
      } else {
        // Not logged in - start with empty state
        setRows([]);
        return { totalCount: 0 };
      }
    } catch (fetchError) {
      logger.error("Error fetching from Supabase:", fetchError);
      // Start with empty state on error
      setRows([]);
      setTotalCount(0);
      return { totalCount: 0 };
    } finally {
      // Remove from fetching set when done
      fetchingPages.delete(cacheKey);
      setLoading(false);
    }
  };

  // Clear cache when user changes
  useEffect(() => {
    pageCache.clear();
    setIsInitialLoad(true);
  }, [user?.id]);

  // Load data on component mount
  useEffect(() => {
    fetchLeadsRows();
  }, [user?.id]);

  // Listen for contact-added events to refresh the data
  useEffect(() => {
    const handleContactAdded = () => {
      logger.log(
        "Contact added event received, clearing cache and refreshing data..."
      );
      pageCache.clear(); // Clear cache when data changes
      fetchLeadsRows(1, 50, true); // Force refresh
    };

    document.addEventListener("contact-added", handleContactAdded);

    return () => {
      document.removeEventListener("contact-added", handleContactAdded);
    };
  }, []);

  // Function to force refresh the data
  const refreshData = () => {
    pageCache.clear(); // Clear all cached pages
    // This will reload the data from Supabase
    fetchLeadsRows(1, 50, true);
  };

  // Save a row to both Supabase and localStorage
  const saveRow = async (rowIndex: number, updatedRow: LeadContact) => {
    // Update local state first for immediate UI feedback
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[rowIndex] = updatedRow;
      return newRows;
    });

    // Update mockContactsById for Stream View
    mockContactsById[updatedRow.id] = updatedRow;

    try {
      // Save to Supabase contacts table if user is authenticated
      if (user) {
        // Extract basic contact fields
        const { id, name, email, phone, company, status } = updatedRow;

        // Everything else goes in the data field
        const data = { ...updatedRow };

        // Remove fields that are columns in the contacts table
        delete data.id;
        delete data.name;
        delete data.email;
        delete data.phone;
        delete data.company;
        delete data.status;

        const { error } = await supabase.from("contacts").upsert({
          id,
          name: name || "",
          email: email || "",
          phone: phone || "",
          company: company || "",
          status: status || "",
          user_id: user.id,
          data,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          throw error;
        }
      } else {
        // Fall back to localStorage if not authenticated
        saveRowsToLocal(rows);
      }
    } catch (error) {
      logger.error(
        "Failed to save to Supabase, saving to localStorage instead:",
        error
      );

      // Fall back to localStorage
      saveRowsToLocal(rows);
    }
  };

  // Get filtered and paginated data
  const getFilteredRows = () => {
    if (!filter) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  };

  // Update a specific cell in a row - this is what we need to add
  const updateCell = async ({
    rowId,
    columnId,
    value,
  }: {
    rowId: string;
    columnId: string;
    value: any;
  }) => {
    // Find the row if it exists in our current state
    const existingRowIndex = rows.findIndex((row) => row.id === rowId);
    let updatedRow;
    let latestRows: LeadContact[] = rows;

    if (existingRowIndex >= 0) {
      // Update existing row
      updatedRow = {
        ...rows[existingRowIndex],
        [columnId]: value,
      };

      // Update local state
      setRows((prevRows) => {
        const newRows = [...prevRows];
        newRows[existingRowIndex] = updatedRow;
        latestRows = newRows;
        return newRows;
      });
    } else {
      // Create a new row
      updatedRow = {
        id: rowId,
        [columnId]: value,
        name: "Untitled Contact", // Add default name to prevent constraint violation
      };

      // Add to local state
      setRows((prevRows) => [updatedRow, ...prevRows]);
      latestRows = [updatedRow, ...rows];
    }

    // Immediately update mockContactsById for Stream View to ensure consistent data
    // This is critical to keep both views in sync
    if (mockContactsById[rowId]) {
      mockContactsById[rowId] = {
        ...mockContactsById[rowId],
        [columnId]: value,
      };
    } else {
      mockContactsById[rowId] = {
        id: rowId,
        name: updatedRow.name || "Untitled Contact", // Ensure name exists
        [columnId]: value,
      };
    }

    // DEBUG: Add this to test simple connection
    if (columnId === "name") {
      logger.debug("-----SUPABASE DEBUG-----");
      logger.debug("Testing simple query to contacts table...");
      const { data: testData, error: testError } = await supabase
        .from("contacts")
        .select("id, name")
        .limit(5);

      if (testError) {
        logger.error("Test query failed:", JSON.stringify(testError, null, 2));
      } else {
        logger.debug("Test query successful:", testData);
      }
      logger.debug("------------------------");
    }

    try {
      // Use our new helper function from updateContact.ts
      // This will handle whether fields go directly in columns or in the data JSON object
      const response = await updateContact({
        id: rowId,
        [columnId]: value,
        name: updatedRow.name, // Ensure name is included for non-null constraint
        user_id: user.id, // Include user_id for RLS policies
      });

      if (response.error) {
        throw response.error;
      }
    } catch (error) {
      logger.error("Error updating cell:", error);
      // Fall back to localStorage
      saveRowsToLocal(rows);

      // Show error toast
      toast({
        title: "Error",
        description:
          "Failed to update contact in database. Changes saved locally.",
        variant: "destructive",
      });
    }

    // Persist the latest rows to local storage regardless of Supabase outcome
    saveRowsToLocal(latestRows);

    return updatedRow;
  };

  // Add a new contact
  const addContact = async (newContact: LeadContact) => {
    try {
      if (user) {
        // Generate a database UUID for storage
        const dbId = uuidv4();

        // Make sure the contact has a proper name
        const contactToSave = {
          ...newContact,
          id: dbId, // Use database ID directly - no mapping needed
          name: newContact.name || "Untitled Contact", // Ensure name field is used
        };

        logger.log("Adding new contact with name:", contactToSave.name);

        // Add to local state first for immediate UI feedback - always at the beginning
        setRows((prevRows) => [contactToSave, ...prevRows]);

        // Update mockContactsById for Stream View
        mockContactsById[dbId] = contactToSave;

        // Extract fields for Supabase
        const { name, email, phone, company, status } = contactToSave;

        // Create data object for other fields
        const data = { ...contactToSave };
        delete data.id;
        delete data.name;
        delete data.email;
        delete data.phone;
        delete data.company;
        delete data.status;

        // Save to Supabase
        const { error } = await supabase.from("contacts").insert({
          id: dbId,
          name: name || "Untitled Contact",
          email: email || "",
          phone: phone || "",
          company: company || "",
          status: status || "",
          user_id: user.id,
          data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) {
          logger.error("Error adding contact to Supabase:", error);
          // Still keep the contact in local state
        }

        // After successful insert, refresh to get the proper page
        await fetchLeadsRows(1, 50); // Refresh first page
      } else {
        // Not logged in, just add to local state
        const uiId =
          newContact.id || `lead-${crypto.randomUUID().substring(0, 8)}`;
        const contactToSave = {
          ...newContact,
          id: uiId,
          name: newContact.name || "Untitled Contact", // Ensure name field is used
        };

        setRows((prevRows) => [contactToSave, ...prevRows]);
        mockContactsById[uiId] = contactToSave;
        saveRowsToLocal(rows);
      }
    } catch (error) {
      logger.error("Error adding contact:", error);
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add function to delete multiple contacts (soft delete)
  const deleteContacts = async (contactIds: string[]): Promise<void> => {
    if (!contactIds.length) return;
    
    // Start timing the delete operation
    const deleteStartTime = performance.now();
    console.log(`🚀 [DELETE TIMING] Starting delete operation for ${contactIds.length} contacts at ${deleteStartTime.toFixed(2)}ms`);
    
    // Store original state in case we need to restore
    const originalRows = [...rows];
    const originalMockContacts: Record<string, LeadContact> = {};
    contactIds.forEach(id => {
      if (mockContactsById[id]) {
        originalMockContacts[id] = { ...mockContactsById[id] };
      }
    });
    
    try {
      // Convert IDs to database format if needed
      const dbIds = contactIds.map(transformRowId);
      
      // IMPORTANT: Pause background loading during delete operation
      const { pauseBackgroundLoading, resumeBackgroundLoading } = useContactsStore.getState();
      pauseBackgroundLoading();
      
      const uiUpdateStartTime = performance.now();
      console.log(`⚡ [DELETE TIMING] Starting UI updates at ${uiUpdateStartTime.toFixed(2)}ms`);
      
      // IMPORTANT: Immediately mark contacts as deleted in the store to prevent flickering
      const { removeContacts } = useContactsStore.getState();
      removeContacts(contactIds);
      
      // Update local state by removing deleted contacts immediately
      const newRows = rows.filter(row => !contactIds.includes(row.id));
      setRows(newRows);
      saveRowsToLocal(newRows);
      
      // Remove from mockContactsById immediately
      contactIds.forEach(id => {
        delete mockContactsById[id];
      });
      
      const uiUpdateEndTime = performance.now();
      console.log(`✅ [DELETE TIMING] UI updates completed in ${(uiUpdateEndTime - uiUpdateStartTime).toFixed(2)}ms`);
      
      // Dispatch immediate UI feedback event (this will close the dialog)
      document.dispatchEvent(new CustomEvent('contacts-deleted-immediate', { 
        detail: { 
          count: contactIds.length,
          contactIds: contactIds,
          timing: uiUpdateEndTime - deleteStartTime
        } 
      }));
      
      if (user) {
        const dbStartTime = performance.now();
        console.log(`🗄️ [DELETE TIMING] Starting database operation at ${dbStartTime.toFixed(2)}ms`);
        
        // Use the soft delete function with aggressive timeout settings for fast UI response
        const { data, error } = await withRetrySupabase(() => 
          supabase.rpc('soft_delete_contacts', {
            contact_ids: dbIds,
            user_id_param: user.id
          }),
          {
            maxAttempts: 2, // Only retry once
            initialDelay: 300, // Very short initial delay
            maxDelay: 1000, // Maximum 1 second delay
            backoffMultiplier: 1.5, // Gentle backoff
            shouldRetry: (error: any) => {
              // Don't retry on timeout errors for faster response
              if (error?.code === '57014' || error?.message?.includes('timeout')) {
                return false;
              }
              // Only retry on network errors, not database errors
              return error?.status >= 500 || !error?.status;
            }
          }
        );
        
        const dbEndTime = performance.now();
        console.log(`🗄️ [DELETE TIMING] Database operation completed in ${(dbEndTime - dbStartTime).toFixed(2)}ms`);
        
        if (error) {
          // If database operation fails, we need to restore the contacts
          console.error(`❌ [DELETE TIMING] Database operation failed after ${(dbEndTime - deleteStartTime).toFixed(2)}ms:`, error);
          logger.error('Soft delete failed, restoring contacts to UI:', error);
          
          // Restore contacts to local state
          setRows(originalRows);
          saveRowsToLocal(originalRows);
          
          // Restore to mockContactsById
          Object.entries(originalMockContacts).forEach(([id, contact]) => {
            mockContactsById[id] = contact;
          });
          
          // Restore to contacts store
          const { restoreContacts } = useContactsStore.getState();
          const contactsToRestore = contactIds.map(id => originalMockContacts[id]).filter(Boolean);
          restoreContacts(contactsToRestore);
          
          throw error;
        }
        
        // Check if any contacts were moved
        const movedCount = data?.[0]?.moved_count || 0;
        if (movedCount === 0) {
          // If no contacts were moved, restore them
          console.warn(`⚠️ [DELETE TIMING] No contacts were moved, restoring after ${(dbEndTime - deleteStartTime).toFixed(2)}ms`);
          logger.warn('No contacts were moved, restoring to UI');
          
          // Restore contacts to local state
          setRows(originalRows);
          saveRowsToLocal(originalRows);
          
          // Restore to mockContactsById
          Object.entries(originalMockContacts).forEach(([id, contact]) => {
            mockContactsById[id] = contact;
          });
          
          // Restore to contacts store
          const { restoreContacts } = useContactsStore.getState();
          const contactsToRestore = contactIds.map(id => originalMockContacts[id]).filter(Boolean);
          restoreContacts(contactsToRestore);
          
          throw new Error('No contacts were deleted');
        }
        
        const totalTime = dbEndTime - deleteStartTime;
        console.log(`🎉 [DELETE TIMING] Successfully deleted ${movedCount} contacts in ${totalTime.toFixed(2)}ms`);
        logger.log(`Soft deleted ${movedCount} contacts`);
      }
      
      // Resume background loading after successful delete
      setTimeout(() => {
        resumeBackgroundLoading();
      }, 2000); // Wait 2 seconds before resuming to let database settle
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['leadsRows', user?.id]);
      queryClient.invalidateQueries(['contacts', user?.id]);
      
      // Dispatch final success event
      const finalTime = performance.now();
      document.dispatchEvent(new CustomEvent('contacts-deleted', { 
        detail: { 
          count: contactIds.length,
          contactIds: contactIds,
          totalTime: finalTime - deleteStartTime
        } 
      }));
      
      console.log(`🏁 [DELETE TIMING] Total operation completed in ${(finalTime - deleteStartTime).toFixed(2)}ms`);
      
    } catch (error) {
      // Resume background loading even if delete failed
      const { resumeBackgroundLoading } = useContactsStore.getState();
      setTimeout(() => {
        resumeBackgroundLoading();
      }, 1000);
      
      const errorTime = performance.now();
      console.error(`💥 [DELETE TIMING] Delete operation failed after ${(errorTime - deleteStartTime).toFixed(2)}ms:`, error);
      logger.error('Error deleting contacts:', error);
      throw new Error('Failed to delete contacts');
    }
  };

  return {
    rows: getFilteredRows(),
    loading,
    saveRow,
    filter,
    setFilter,
    PAGE_SIZE,
    updateCell,
    addContact,
    deleteContacts,
    refreshData,
    fetchLeadsRows,
    totalCount,
  };
}
