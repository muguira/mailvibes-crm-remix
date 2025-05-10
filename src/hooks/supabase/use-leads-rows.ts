import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateDummyLeads, mockContactsById } from '@/components/stream/sample-data';
import { LeadContact } from '@/components/stream/sample-data';
import { useAuth } from '@/contexts/AuthContext';
import { useActivity } from '@/contexts/ActivityContext';

// Constants
export const PAGE_SIZE = 100;
const LEADS_STORAGE_KEY = 'leadsRows-v1';

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

export interface UpdateCellParams {
  rowId: string;
  columnId: string;
  value: any;
}

export function useLeadsRows() {
  const { user } = useAuth();
  const { logCellEdit, logContactAdd } = useActivity();
  const [rows, setRows] = useState<LeadContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  
  // Update mockContactsById whenever rows change
  useEffect(() => {
    rows.forEach(row => {
      mockContactsById[row.id] = row;
    });
  }, [rows]);
  
  // Load data on component mount
  useEffect(() => {
    async function fetchLeadsRows() {
      setLoading(true);
      
      try {
        // First try to fetch from Supabase
        const { data, error } = await supabase
          .from('leads_rows')
          .select('*')
          .eq('user_id', user?.id || 'anonymous') // Filter by current user
          .order('row_id');
        
        if (error) {
          throw error;
        }
        
        // If we have data in Supabase, use it
        if (data && data.length > 0) {
          const processedRows = data.map(row => row.data as LeadContact);
          setRows(processedRows);
          
          // Keep mockContactsById in sync
          processedRows.forEach(row => {
            mockContactsById[row.id] = row;
          });
        } else {
          // If no data in Supabase, generate dummy data and seed the database
          const dummyLeads = generateDummyLeads(20);
          
          // Save to Supabase
          try {
            const insertPromises = dummyLeads.map((lead, index) => 
              supabase.from('leads_rows').insert({
                row_id: index + 1,
                data: lead,
                user_id: user?.id || 'anonymous'
              })
            );
            
            await Promise.all(insertPromises);
            
            // Log contacts being added
            dummyLeads.forEach(lead => {
              logContactAdd(lead.id, lead.name || 'Unnamed Contact');
            });
          } catch (insertError) {
            console.error('Failed to seed Supabase:', insertError);
          }
          
          // Also save to localStorage as fallback
          saveRowsToLocal(dummyLeads);
          
          // Keep mockContactsById in sync
          dummyLeads.forEach(lead => {
            mockContactsById[lead.id] = lead;
          });
          
          setRows(dummyLeads);
        }
      } catch (fetchError) {
        console.error('Error fetching from Supabase, falling back to localStorage:', fetchError);
        
        // Fall back to localStorage
        const localRows = loadRowsFromLocal();
        if (localRows.length > 0) {
          setRows(localRows);
          
          // Keep mockContactsById in sync
          localRows.forEach(row => {
            mockContactsById[row.id] = row;
          });
        } else {
          // Generate new dummy data as last resort
          const dummyLeads = generateDummyLeads(20);
          saveRowsToLocal(dummyLeads);
          setRows(dummyLeads);
          
          // Keep mockContactsById in sync
          dummyLeads.forEach(lead => {
            mockContactsById[lead.id] = lead;
          });
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeadsRows();
  }, [user?.id, logContactAdd]);
  
  // Save a row to both Supabase and localStorage
  const updateCell = async ({ rowId, columnId, value }: UpdateCellParams) => {
    // Find the current row and value for logging the change
    const rowIndex = rows.findIndex(r => r.id === rowId);
    const row = rows[rowIndex];
    const oldValue = row ? row[columnId as keyof typeof row] : undefined;
    
    // Update local state first for immediate UI feedback
    setRows(prevRows => {
      const newRows = [...prevRows];
      const rowIndex = newRows.findIndex(r => r.id === rowId);
      
      // If row exists, update it
      if (rowIndex >= 0) {
        newRows[rowIndex] = {
          ...newRows[rowIndex],
          [columnId]: value
        };
      } else {
        // Create a new row if it doesn't exist
        newRows.push({
          id: rowId,
          name: columnId === 'name' ? value : 'New Contact',
          [columnId]: value
        } as LeadContact);
      }
      
      return newRows;
    });
    
    // Update mockContactsById for Stream View integrity
    if (mockContactsById[rowId]) {
      mockContactsById[rowId] = {
        ...mockContactsById[rowId],
        [columnId]: value
      };
    } else {
      mockContactsById[rowId] = {
        id: rowId,
        name: columnId === 'name' ? value : 'New Contact',
        [columnId]: value
      } as LeadContact;
    }
    
    try {
      // Find the updated or new row
      const updatedRow = rows.find(r => r.id === rowId) || { id: rowId };
      const updatedData = { ...updatedRow, [columnId]: value };
      
      // Save to Supabase if user is authenticated
      if (user) {
        const rowToUpdate = rows.findIndex(r => r.id === rowId);
        const rowId = rowToUpdate >= 0 ? rowToUpdate + 1 : rows.length + 1;
        
        const { error } = await supabase
          .from('leads_rows')
          .upsert({
            row_id: rowId,
            data: updatedData,
            user_id: user.id,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          throw error;
        }
      } else {
        // Fall back to localStorage if not authenticated
        saveRowsToLocal(rows);
      }
      
      // Log the cell edit activity
      logCellEdit(
        rowId, 
        columnId, 
        value, 
        oldValue
      );
    } catch (error) {
      console.error('Failed to save to Supabase, saving to localStorage instead:', error);
      
      // Fall back to localStorage
      saveRowsToLocal(rows);
    }
  };
  
  // Get filtered rows
  const getFilteredRows = () => {
    if (!filter) return rows;
    
    return rows.filter(row => 
      Object.values(row).some(value => 
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  };
  
  return {
    rows,
    loading,
    updateCell,
    filter,
    setFilter,
    getFilteredRows,
    PAGE_SIZE,
  };
}
