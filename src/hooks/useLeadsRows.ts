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
        // First try to fetch from Supabase using contacts table
        if (user) {
          let query = supabase
            .from('contacts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          const { data, error } = await query;
          
          if (error) {
            throw error;
          }
          
          // If we have data in Supabase, use it
          if (data && data.length > 0) {
            // Convert contacts to LeadContact format
            const processedRows = data.map(contact => {
              const leadContact: LeadContact = {
                id: contact.id,
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
            
            setRows(processedRows);
            
            // Keep mockContactsById in sync
            processedRows.forEach(row => {
              mockContactsById[row.id] = row;
            });
          } else {
            // If no data in Supabase, generate dummy data and seed the database
            const dummyLeads = generateDummyLeads(1000);
            
            // Save to Supabase contacts table
            try {
              const insertPromises = dummyLeads.map((lead) => 
                supabase.from('contacts').insert({
                  id: lead.id,
                  name: lead.name || '',
                  email: lead.email || '',
                  phone: lead.phone || '',
                  company: lead.company || '',
                  status: lead.leadStatus || '',
                  user_id: user.id,
                  data: {
                    // Include all other fields from lead
                    title: lead.title,
                    location: lead.location,
                    avatarUrl: lead.avatarUrl,
                    owner: lead.owner,
                    lastContacted: lead.lastContacted,
                    lifecycleStage: lead.lifecycleStage,
                    source: lead.source,
                    industry: lead.industry,
                    // etc...
                  }
                })
              );
              
              await Promise.all(insertPromises);
            } catch (insertError) {
              console.error('Failed to seed Supabase contacts:', insertError);
            }
            
            // Also save to localStorage as fallback
            saveRowsToLocal(dummyLeads);
            
            // Keep mockContactsById in sync
            dummyLeads.forEach(lead => {
              mockContactsById[lead.id] = lead;
            });
            
            setRows(dummyLeads);
          }
        } else {
          // Not logged in, use localStorage
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