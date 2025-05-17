// @ts-nocheck
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../use-toast";
import { v4 as uuidv4 } from 'uuid';
import { GridRow } from "@/components/grid-view/types";
import { LEADS_STORAGE_KEY } from "@/constants/grid";
import { useState, useEffect } from 'react';
import { LeadContact } from '@/components/stream/sample-data';
import { mockContactsById } from '@/components/stream/sample-data';
import { updateContact } from '@/helpers/updateContact';
import { useActivity } from "@/contexts/ActivityContext";

/**
 * Helper function to transform row IDs to database-compatible format
 * - Converts "lead-XXX" format to integer if possible
 * - Falls back to original ID if can't be transformed
 */
function transformRowId(id: string): string | number {
  // If ID has format "lead-XXX", try to extract just the number
  if (typeof id === 'string' && id.startsWith('lead-')) {
    try {
      // Extract the number part and convert to integer
      const numericPart = id.replace('lead-', '');
      // Remove leading zeros from numeric part (e.g., '007' becomes '7')
      const cleanNumeric = numericPart.replace(/^0+/, '');
      return parseInt(cleanNumeric, 10);
    } catch (e) {
      console.warn(`Could not transform row ID ${id} to number:`, e);
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
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('id', rowId)
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
  const filteredRows = rawRows.filter(row => row.id !== "pedro" && !row.id.includes("test-"));

  // Sort rows by ID in ascending order 
  return sortRowsByIdAscending(filteredRows);
};

// Constants
export const PAGE_SIZE = 100;

// Local storage fallback functions
const loadRowsFromLocal = (): LeadContact[] => {
  try {
    const savedRows = localStorage.getItem(LEADS_STORAGE_KEY);
    if (savedRows) {
      return JSON.parse(savedRows);
    }
  } catch (error) {
    console.error('Failed to load rows from localStorage:', error);
  }
  return [];
};

const saveRowsToLocal = (rows: LeadContact[]): void => {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(rows));
  } catch (error) {
    console.error('Failed to save rows to localStorage:', error);
  }
};

/**
 * Hook for managing lead rows with Supabase persistence
 * Falls back to localStorage when not authenticated
 */
export function useLeadsRows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<LeadContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const { logContactAdd } = useActivity();

  // Update mockContactsById whenever rows change
  useEffect(() => {
    rows.forEach(row => {
      mockContactsById[row.id] = row;
    });
  }, [rows]);

  // Function to fetch data from Supabase
  const fetchLeadsRows = async () => {
    setLoading(true);

    try {
      // First try to fetch from Supabase using contacts table
      if (user) {
        // Don't clear ID mappings on load - this was causing issues
        // Instead we'll use a stable mapping system

        let query = supabase
          .from('contacts')
          .select('id, name, email, phone, company, status, user_id, data, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error("SUPABASE ERROR:", error);
          throw error;
        }

        // If we have data in Supabase, use it
        if (data && data.length > 0) {
          // Get existing ID mapping
          const existingMapping = JSON.parse(localStorage.getItem('id-mapping') || '{}');

          // Create a reverse mapping for lookups (DB ID -> UI ID)
          const reverseMapping = Object.entries(existingMapping).reduce((acc, [uiId, dbId]) => {
            acc[dbId as string] = uiId;
            return acc;
          }, {} as Record<string, string>);

          // Convert contacts to LeadContact format with stable IDs
          const processedRows = data.map((contact, index) => {
            // Check if this DB ID already has a UI ID mapping
            let uiId = reverseMapping[contact.id];

            // If no existing mapping, create a stable one based on index
            if (!uiId) {
              uiId = `lead-${String(index + 1).padStart(3, '0')}`;
              existingMapping[uiId] = contact.id;
            }

            const leadContact: LeadContact = {
              id: uiId, // Use the stable UI ID
              name: contact.name,
              email: contact.email || '',
              phone: contact.phone || '',
              company: contact.company || '',
              status: contact.status || '',
              // Use existing data field or create empty object
              ...(contact.data || {})
            };
            return leadContact;
          });

          // Save the updated ID mapping
          localStorage.setItem('id-mapping', JSON.stringify(existingMapping));

          setRows(processedRows);

          // Keep mockContactsById in sync
          processedRows.forEach(row => {
            mockContactsById[row.id] = row;
          });
        } else {
          // Start with an empty array - don't generate dummy data
          setRows([]);

          // Clear mockContactsById to ensure no dummy data
          Object.keys(mockContactsById).forEach(key => {
            delete mockContactsById[key];
          });
        }
      } else {
        // Not logged in - start with empty state
        setRows([]);
      }
    } catch (fetchError) {
      console.error('Error fetching from Supabase:', fetchError);
      // Start with empty state on error
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchLeadsRows();
  }, [user?.id]);

  // Function to force refresh the data
  const refreshData = () => {
    // This will reload the data from Supabase
    fetchLeadsRows();
  };

  // Save a row to both Supabase and localStorage
  const saveRow = async (rowIndex: number, updatedRow: LeadContact) => {
    // Update local state first for immediate UI feedback
    setRows(prevRows => {
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

        const { error } = await supabase
          .from('contacts')
          .upsert({
            id,
            name: name || '',
            email: email || '',
            phone: phone || '',
            company: company || '',
            status: status || '',
            user_id: user.id,
            data,
            updated_at: new Date().toISOString()
          });

        if (error) {
          throw error;
        }
      } else {
        // Fall back to localStorage if not authenticated
        saveRowsToLocal(rows);
      }
    } catch (error) {
      console.error('Failed to save to Supabase, saving to localStorage instead:', error);

      // Fall back to localStorage
      saveRowsToLocal(rows);
    }
  };

  // Get filtered and paginated data
  const getFilteredRows = () => {
    if (!filter) return rows;

    return rows.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  };

  // Update a specific cell in a row - this is what we need to add
  const updateCell = async ({ rowId, columnId, value }: { rowId: string; columnId: string; value: any }) => {
    // Find the row if it exists in our current state
    const existingRowIndex = rows.findIndex(row => row.id === rowId);
    let updatedRow;

    if (existingRowIndex >= 0) {
      // Update existing row
      updatedRow = {
        ...rows[existingRowIndex],
        [columnId]: value
      };

      // Update local state
      setRows(prevRows => {
        const newRows = [...prevRows];
        newRows[existingRowIndex] = updatedRow;
        return newRows;
      });
    } else {
      // Create a new row
      updatedRow = {
        id: rowId,
        [columnId]: value,
        name: 'Untitled Contact', // Add default name to prevent constraint violation
      };

      // Add to local state
      setRows(prevRows => [updatedRow, ...prevRows]);
    }

    // Immediately update mockContactsById for Stream View to ensure consistent data
    // This is critical to keep both views in sync
    if (mockContactsById[rowId]) {
      mockContactsById[rowId] = {
        ...mockContactsById[rowId],
        [columnId]: value
      };
    } else {
      mockContactsById[rowId] = {
        id: rowId,
        name: updatedRow.name || 'Untitled Contact', // Ensure name exists
        [columnId]: value
      };
    }

    // DEBUG: Add this to test simple connection
    if (columnId === 'name') {
      console.log("-----SUPABASE DEBUG-----");
      console.log("Testing simple query to contacts table...");
      const { data: testData, error: testError } = await supabase
        .from('contacts')
        .select('id, name')
        .limit(5);

      if (testError) {
        console.error("Test query failed:", JSON.stringify(testError, null, 2));
      } else {
        console.log("Test query successful:", testData);
      }
      console.log("------------------------");
    }

    try {
      // Use our new helper function from updateContact.ts
      // This will handle whether fields go directly in columns or in the data JSON object
      const response = await updateContact({
        id: rowId,
        [columnId]: value,
        name: updatedRow.name, // Ensure name is included for non-null constraint
        user_id: user.id // Include user_id for RLS policies
      });

      if (response.error) {
        throw response.error;
      }
    } catch (error) {
      console.error('Error updating cell:', error);
      // Fall back to localStorage
      saveRowsToLocal(rows);

      // Show error toast
      toast({
        title: "Error",
        description: "Failed to update contact in database. Changes saved locally.",
        variant: "destructive"
      });
    }

    return updatedRow;
  };

  // Add a new contact
  const addContact = async (newContact: LeadContact) => {
    try {
      if (user) {
        // Generate a new row number that's always 1 less than the smallest existing row number
        // This ensures new contacts always appear at the top
        const smallestRowNum = rows.reduce((min, row) => {
          const match = row.id.match(/lead-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            return num < min ? num : min;
          }
          return min;
        }, 999); // Start with a large number

        const rowNumber = Math.max(1, smallestRowNum - 1);

        // Create a stable ID that will always sort to the top
        const uiId = `lead-${String(rowNumber).padStart(3, '0')}`;

        // Generate a database UUID for storage
        const dbId = uuidv4();

        // Store the mapping
        const idMapping = JSON.parse(localStorage.getItem('id-mapping') || '{}');
        idMapping[uiId] = dbId;
        localStorage.setItem('id-mapping', JSON.stringify(idMapping));

        // Make sure the contact has a proper name
        const contactToSave = {
          ...newContact,
          id: uiId,
          name: newContact.name || 'Untitled Contact' // Ensure name field is used
        };

        console.log("Adding new contact with name:", contactToSave.name);

        // Add to local state first for immediate UI feedback - always at the beginning
        setRows(prevRows => [contactToSave, ...prevRows]);

        // Update mockContactsById for Stream View
        mockContactsById[uiId] = contactToSave;

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
        const { error } = await supabase
          .from('contacts')
          .insert({
            id: dbId,
            name: name || 'Untitled Contact',
            email: email || '',
            phone: phone || '',
            company: company || '',
            status: status || '',
            user_id: user.id,
            data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error adding contact to Supabase:', error);
          // Still keep the contact in local state
        } else {
          // Log the activity after successful save
          logContactAdd(uiId, contactToSave.name);
        }
      } else {
        // Not logged in, just add to local state
        const uiId = newContact.id || `lead-${crypto.randomUUID().substring(0, 8)}`;
        const contactToSave = {
          ...newContact,
          id: uiId,
          name: newContact.name || 'Untitled Contact' // Ensure name field is used
        };

        setRows(prevRows => [contactToSave, ...prevRows]);
        mockContactsById[uiId] = contactToSave;
        saveRowsToLocal(rows);

        // Log the activity even for local storage
        logContactAdd(uiId, contactToSave.name);
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive"
      });
    }
  };

  return {
    rows,
    loading,
    saveRow,
    filter,
    setFilter,
    getFilteredRows,
    PAGE_SIZE,
    updateCell, // Export the updateCell function
    addContact, // Export the addContact function
    refreshData, // Export the refresh function
  };
} 