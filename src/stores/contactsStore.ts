import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { LeadContact } from '@/components/stream/sample-data';
import { logger } from '@/utils/logger';

interface ContactsState {
  // Core data
  cache: Record<string, LeadContact>;    // keyed by id
  orderedIds: string[];                   // preserve sort order
  
  // Loading states
  loading: boolean;                       // background fetch in progress
  hasMore: boolean;                       // whether more chunks exist
  totalCount: number;                     // total contacts in database
  loadedCount: number;                    // contacts loaded so far
  
  // Methods
  fetchNext: () => Promise<void>;         // pulls the next chunk
  initialize: (userId: string) => Promise<void>; // initial load
  clear: () => void;                      // clear cache
  
  // Internal state
  _offset: number;                        // current offset for pagination
  _userId: string | null;                 // current user ID
  _chunkSize: number;                     // size of each chunk
}

const CHUNK_SIZE = 1000; // Fetch 1000 contacts at a time

export const useContactsStore = create<ContactsState>((set, get) => ({
  // Initial state
  cache: {},
  orderedIds: [],
  loading: false,
  hasMore: true,
  totalCount: 0,
  loadedCount: 0,
  
  // Internal state
  _offset: 0,
  _userId: null,
  _chunkSize: CHUNK_SIZE,
  
  // Clear the cache
  clear: () => {
    set({
      cache: {},
      orderedIds: [],
      loading: false,
      hasMore: true,
      totalCount: 0,
      loadedCount: 0,
      _offset: 0,
    });
  },
  
  // Initialize with first batch of data
  initialize: async (userId: string) => {
    const state = get();
    
    // If already initialized for this user, skip
    if (state._userId === userId && state.orderedIds.length > 0) {
      return;
    }
    
    // Clear if switching users
    if (state._userId !== userId) {
      get().clear();
    }
    
    set({ _userId: userId, loading: true });
    
    try {
      // Get total count first
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      set({ totalCount: count || 0 });
      
      // Fetch first batch
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, company, status, user_id, data, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(0, 49); // First 50 rows
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const cache: Record<string, LeadContact> = {};
        const orderedIds: string[] = [];
        
        // Process contacts
        data.forEach(contact => {
          const leadContact: LeadContact = {
            id: contact.id,
            name: contact.name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            company: contact.company || '',
            status: contact.status || '',
            importListName: contact.data?.importListName || '',
            importOrder: contact.data?.importOrder,
            ...(contact.data || {})
          };
          
          cache[contact.id] = leadContact;
          orderedIds.push(contact.id);
        });
        
        set({
          cache,
          orderedIds,
          loadedCount: data.length,
          _offset: 50,
          hasMore: (count || 0) > 50,
          loading: false
        });
        
        logger.log(`Initialized contacts store with ${data.length} contacts`);
      } else {
        set({ loading: false, hasMore: false });
      }
    } catch (error) {
      logger.error('Failed to initialize contacts store:', error);
      set({ loading: false, hasMore: false });
    }
  },
  
  // Fetch next chunk of data
  fetchNext: async () => {
    const state = get();
    
    if (state.loading || !state.hasMore || !state._userId) {
      return;
    }
    
    set({ loading: true });
    
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, company, status, user_id, data, created_at, updated_at')
        .eq('user_id', state._userId)
        .order('created_at', { ascending: false })
        .range(state._offset, state._offset + state._chunkSize - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const newCache = { ...state.cache };
        const newOrderedIds = [...state.orderedIds];
        
        // Process new contacts
        data.forEach(contact => {
          const leadContact: LeadContact = {
            id: contact.id,
            name: contact.name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            company: contact.company || '',
            status: contact.status || '',
            importListName: contact.data?.importListName || '',
            importOrder: contact.data?.importOrder,
            ...(contact.data || {})
          };
          
          // Only add if not already in cache
          if (!newCache[contact.id]) {
            newCache[contact.id] = leadContact;
            newOrderedIds.push(contact.id);
          }
        });
        
        const newLoadedCount = state.loadedCount + data.length;
        const hasMore = newLoadedCount < state.totalCount;
        
        set({
          cache: newCache,
          orderedIds: newOrderedIds,
          loadedCount: newLoadedCount,
          _offset: state._offset + state._chunkSize,
          hasMore,
          loading: false
        });
        
        logger.log(`Loaded chunk: ${data.length} contacts (total: ${newLoadedCount}/${state.totalCount})`);
      } else {
        set({ hasMore: false, loading: false });
      }
    } catch (error) {
      logger.error('Failed to fetch next chunk:', error);
      set({ loading: false });
    }
  }
})); 