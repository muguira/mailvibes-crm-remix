
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateDummyLeads, mockContactsById } from '@/components/stream/sample-data';
import { LeadContact } from '@/components/stream/sample-data';
import { useAuth } from '@/contexts/AuthContext';

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

export function useLeadsRows() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeadContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  
  // Load data on component mount
  useEffect(() => {
    async function fetchLeadsRows() {
      setLoading(true);
      
      try {
        // First try to fetch from Supabase
        const { data, error } = await supabase
          .from('leads_rows')
          .select('row_id, data')
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
          const dummyLeads = generateDummyLeads(1000);
          
          // Save to Supabase
          try {
            const insertPromises = dummyLeads.map((lead, index) => 
              supabase.from('leads_rows').insert({
                row_id: index + 1,
                data: lead,
                user_id: user?.id || null
              })
            );
            
            await Promise.all(insertPromises);
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
          const dummyLeads = generateDummyLeads(1000);
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
  }, [user?.id]);
  
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
      // Save to Supabase
      const { error } = await supabase
        .from('leads_rows')
        .upsert({
          row_id: rowIndex + 1,
          user_id: user?.id || null,
          data: updatedRow
        });
      
      if (error) {
        throw error;
      }
      
    } catch (error) {
      console.error('Failed to save to Supabase, saving to localStorage instead:', error);
      
      // Fall back to localStorage
      saveRowsToLocal(rows);
      
      // Queue for retry when connection is restored
      // In a real app, we'd implement a more sophisticated retry mechanism
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
  
  return {
    rows,
    loading,
    saveRow,
    filter,
    setFilter,
    getFilteredRows,
    PAGE_SIZE,
  };
}
