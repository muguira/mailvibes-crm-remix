import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { LeadContact } from '@/components/stream/sample-data';
import { logger } from '@/utils/logger';

interface ContactsState {
  // Core data
  cache: Record<string, LeadContact>;    // keyed by id
  orderedIds: string[];                   // preserve sort order
  
  // Loading states
  loading: boolean;                       // initial batch loading
  hasMore: boolean;                       // whether more chunks exist
  totalCount: number;                     // total contacts in database
  loadedCount: number;                    // contacts loaded so far
  isBackgroundLoading: boolean;           // background loading active
  isInitialized: boolean;                 // whether the store has been initialized
  firstBatchLoaded: boolean;              // whether first 1K contacts are loaded
  allContactsLoaded: boolean;             // whether all contacts have been loaded
  
  // Methods
  fetchNext: () => Promise<void>;         // pulls the next chunk
  initialize: (userId: string) => Promise<void>; // initial load
  startBackgroundLoading: () => Promise<void>; // start background loading
  pauseBackgroundLoading: () => void;     // pause background loading
  resumeBackgroundLoading: () => void;    // resume background loading
  clear: () => void;                      // clear cache
  removeContacts: (contactIds: string[]) => void; // remove contacts from cache
  restoreContacts: (contacts: LeadContact[]) => void; // restore contacts to cache
  
  // Internal state
  _offset: number;                        // current offset for pagination
  _userId: string | null;                 // current user ID
  _chunkSize: number;                     // size of each chunk
  _backgroundLoadingActive: boolean;      // track if background loading is running
  _backgroundLoadingPaused: boolean;      // track if background loading is paused
  _deletedContactIds: Set<string>;        // track deleted contacts to prevent re-adding
}

const FIRST_BATCH_SIZE = 1000; // First batch - load immediately
const CHUNK_SIZE = 1000; // Background chunks

// Store the background loading promise outside of the store
let backgroundLoadingPromise: Promise<void> | null = null;
let initializationPromise: Promise<void> | null = null; // Track ongoing initialization

// Load deleted IDs from localStorage
const loadDeletedIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem('deleted-contact-ids');
    if (stored) {
      const ids = JSON.parse(stored);
      logger.log(`Loaded ${ids.length} deleted contact IDs from localStorage`);
      return new Set(ids);
    }
  } catch (error) {
    logger.error('Failed to load deleted contact IDs:', error);
  }
  return new Set<string>();
};

// Save deleted IDs to localStorage
const saveDeletedIds = (deletedIds: Set<string>) => {
  try {
    const deletedArray = Array.from(deletedIds);
    localStorage.setItem('deleted-contact-ids', JSON.stringify(deletedArray));
    logger.log(`Persisted ${deletedArray.length} deleted contact IDs to localStorage`);
  } catch (error) {
    logger.error('Failed to persist deleted contact IDs:', error);
  }
};

export const useContactsStore = create<ContactsState>((set, get) => ({
  // Initial state
  cache: {},
  orderedIds: [],
  loading: false,
  hasMore: true,
  totalCount: 0,
  loadedCount: 0,
  isBackgroundLoading: false,
  isInitialized: false,
  firstBatchLoaded: false,
  allContactsLoaded: false,
  
  // Internal state
  _offset: 0,
  _userId: null,
  _chunkSize: CHUNK_SIZE,
  _backgroundLoadingActive: false,
  _backgroundLoadingPaused: false,
  _deletedContactIds: loadDeletedIds(), // Load from localStorage
  
  // Clear the cache - only called on logout
  clear: () => {
    logger.log('[ContactsStore] Clear called - resetting entire store for logout');
    
    // Cancel any ongoing background loading
    backgroundLoadingPromise = null;
    initializationPromise = null;
    
    // Clear all data and reset to initial state
    set({
      cache: {},
      orderedIds: [],
      loading: false,
      hasMore: true,
      totalCount: 0,
      loadedCount: 0,
      isBackgroundLoading: false,
      isInitialized: false,
      firstBatchLoaded: false,
      allContactsLoaded: false,
      _offset: 0,
      _userId: null,
      _backgroundLoadingActive: false,
      _backgroundLoadingPaused: false,
      // Keep deleted IDs even after logout
      _deletedContactIds: get()._deletedContactIds,
    });
  },
  
  // Remove contacts from cache
  removeContacts: (contactIds: string[]) => {
    const state = get();
    const contactIdSet = new Set(contactIds);
    
    // Create new cache without deleted contacts
    const newCache = { ...state.cache };
    contactIds.forEach(id => {
      delete newCache[id];
    });
    
    // Filter out deleted contacts from orderedIds
    const newOrderedIds = state.orderedIds.filter(id => !contactIdSet.has(id));
    
    // Update counts
    const deletedCount = state.orderedIds.length - newOrderedIds.length;
    const newLoadedCount = Math.max(0, state.loadedCount - deletedCount);
    const newTotalCount = Math.max(0, state.totalCount - deletedCount);
    
    // Add deleted IDs to the tracking set
    const newDeletedIds = new Set(state._deletedContactIds);
    contactIds.forEach(id => newDeletedIds.add(id));
    
    // Persist deleted IDs to localStorage
    saveDeletedIds(newDeletedIds);
    
    set({
      cache: newCache,
      orderedIds: newOrderedIds,
      loadedCount: newLoadedCount,
      totalCount: newTotalCount,
      _deletedContactIds: newDeletedIds
    });
    
    logger.log(`Removed ${deletedCount} contacts from store`);
  },
  
  // Initialize with first batch of data
  initialize: async (userId: string) => {
    // If there's already an ongoing initialization, return it
    if (initializationPromise) {
      console.log('[ContactsStore] Initialization already in progress, waiting for it to complete');
      return initializationPromise;
    }
    
    const state = get();
    
    logger.log(`Initialize called for user ${userId}. Current state:`, {
      currentUserId: state._userId,
      hasData: state.orderedIds.length > 0,
      loadedCount: state.loadedCount,
      totalCount: state.totalCount,
      hasMore: state.hasMore,
      isBackgroundLoading: state._backgroundLoadingActive,
      isInitialized: state.isInitialized,
      firstBatchLoaded: state.firstBatchLoaded,
      allContactsLoaded: state.allContactsLoaded
    });
    
    // If already initialized for this user and we have the first batch, just resume background loading if needed
    if (state._userId === userId && state.isInitialized && state.firstBatchLoaded) {
      logger.log('Store already initialized for this user with first batch loaded');
      
      // If we haven't loaded all contacts yet and not currently loading, resume background loading
      if (!state.allContactsLoaded && state.hasMore && !state._backgroundLoadingActive) {
        logger.log('Resuming background loading for remaining contacts...');
        get().startBackgroundLoading();
      } else if (state.allContactsLoaded) {
        logger.log('All contacts already loaded, no need to reload');
      } else if (state._backgroundLoadingActive) {
        logger.log('Background loading already active');
      }
      return;
    }
    
    // If switching users, clear everything
    if (state._userId && state._userId !== userId) {
      logger.log(`Switching users from ${state._userId} to ${userId}, clearing store`);
      get().clear();
    }
    
    logger.log(`Starting fresh initialization for user ${userId}`);
    
    // Create and track the initialization promise
    initializationPromise = (async () => {
      set({ _userId: userId, loading: true });
      
      try {
        // Get total count first
        const { count } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        logger.log(`Total contacts in database: ${count || 0}`);
        set({ totalCount: count || 0 });
        
        // Fetch first batch (1000 contacts)
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, email, phone, company, status, user_id, data, created_at, updated_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(0, FIRST_BATCH_SIZE - 1); // First 1000 rows
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const cache: Record<string, LeadContact> = {};
          const orderedIds: string[] = [];
          const currentDeletedIds = get()._deletedContactIds;
          
          // Process contacts
          data.forEach(contact => {
            // Skip if this contact has been deleted
            if (currentDeletedIds.has(contact.id)) {
              logger.log(`Skipping deleted contact: ${contact.id}`);
              return;
            }
            
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
          
          const hasMoreContacts = (count || 0) > FIRST_BATCH_SIZE;
          const allLoaded = !hasMoreContacts;
          
          set({
            cache,
            orderedIds,
            loadedCount: orderedIds.length,
            _offset: FIRST_BATCH_SIZE,
            hasMore: hasMoreContacts,
            loading: false,
            isInitialized: true,
            firstBatchLoaded: true,
            allContactsLoaded: allLoaded
          });
          
          logger.log(`Loaded first batch: ${orderedIds.length} contacts (after filtering deleted)`);
          logger.log(`Has more contacts: ${hasMoreContacts}, All loaded: ${allLoaded}`);
          
          // Start background loading for remaining contacts if there are more
          if (hasMoreContacts) {
            logger.log('Starting background loading for remaining contacts...');
            // Small delay to let UI render first batch
            setTimeout(() => {
              get().startBackgroundLoading();
            }, 500);
          }
        } else {
          logger.log('No contacts found for user');
          set({ 
            loading: false, 
            hasMore: false, 
            isInitialized: true,
            firstBatchLoaded: true,
            allContactsLoaded: true
          });
        }
      } catch (error) {
        logger.error('Failed to initialize contacts store:', error);
        set({ 
          loading: false, 
          hasMore: false, 
          isInitialized: true 
        });
      }
    })();
    
    // Wait for initialization to complete and then clear the promise
    try {
      await initializationPromise;
    } finally {
      initializationPromise = null;
    }
  },
  
  // Start background loading process
  startBackgroundLoading: async () => {
    const state = get();
    
    // Don't start if already loaded all contacts
    if (state.allContactsLoaded) {
      logger.log('All contacts already loaded, skipping background loading');
      return;
    }
    
    // If paused, background loading is disabled, or already loading, return
    if (state._backgroundLoadingPaused || state._backgroundLoadingActive || !state.hasMore || !state._userId) {
      return backgroundLoadingPromise || Promise.resolve();
    }
    
    // If we already have a background loading promise, return it
    if (backgroundLoadingPromise) {
      return backgroundLoadingPromise;
    }
    
    set({ _backgroundLoadingActive: true, isBackgroundLoading: true });
    
    // Create the background loading promise
    backgroundLoadingPromise = (async () => {
      try {
        logger.log('Starting background loading of remaining contacts...');
        
        // Keep loading while there's more data and not paused
        while (get().hasMore && get()._userId === state._userId && !get()._backgroundLoadingPaused && !get().allContactsLoaded) {
          await get().fetchNext();
          
          // Small delay between chunks to keep UI responsive
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const finalState = get();
        if (!finalState.hasMore) {
          set({ allContactsLoaded: true });
          logger.log(`Background loading complete! All ${finalState.loadedCount} contacts loaded.`);
        } else {
          logger.log('Background loading paused or stopped');
        }
      } catch (error) {
        logger.error('Background loading error:', error);
      } finally {
        set({ _backgroundLoadingActive: false, isBackgroundLoading: false });
        backgroundLoadingPromise = null;
      }
    })();
    
    return backgroundLoadingPromise;
  },
  
  // Fetch next chunk of data
  fetchNext: async () => {
    const state = get();
    
    // Check if paused or other conditions that should stop loading
    if (state._backgroundLoadingPaused || state.loading || !state.hasMore || !state._userId || state.allContactsLoaded) {
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
        
        // Get the latest deleted IDs from current state
        const currentState = get();
        const currentDeletedIds = currentState._deletedContactIds;
        
        let addedCount = 0;
        
        // Process new contacts
        data.forEach(contact => {
          // Skip if this contact has been deleted
          if (currentDeletedIds.has(contact.id)) {
            logger.log(`Skipping deleted contact during fetch: ${contact.id}`);
            return;
          }
          
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
            addedCount++;
          }
        });
        
        const newLoadedCount = state.loadedCount + addedCount;
        const hasMore = data.length === state._chunkSize && newLoadedCount < state.totalCount;
        
        set({
          cache: newCache,
          orderedIds: newOrderedIds,
          loadedCount: newLoadedCount,
          _offset: state._offset + state._chunkSize,
          hasMore,
          loading: false,
          allContactsLoaded: !hasMore
        });
        
        logger.log(`Loaded chunk: ${addedCount} new contacts (total: ${newLoadedCount}/${state.totalCount})`);
      } else {
        set({ 
          hasMore: false, 
          loading: false,
          allContactsLoaded: true 
        });
        logger.log('No more contacts to load');
      }
    } catch (error) {
      logger.error('Failed to fetch next chunk:', error);
      
      // If it's a timeout error, adjust strategy
      if (error.code === '57014' || error.message?.includes('timeout')) {
        logger.log('Database timeout detected, adjusting strategy');
        
        // Only reduce chunk size if it's still large
        const currentChunkSize = state._chunkSize;
        if (currentChunkSize > 500) {
          const newChunkSize = Math.max(500, Math.floor(currentChunkSize * 0.75)); // Reduce by 25%, minimum 500
          set({ 
            _chunkSize: newChunkSize,
            loading: false
          });
          logger.log(`Reduced chunk size from ${currentChunkSize} to ${newChunkSize}`);
        } else {
          // If chunk size is already small, just pause briefly
          set({ loading: false });
        }
        
        // Add a small delay before next attempt
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
      } else {
        set({ loading: false });
      }
    }
  },
  
  // Restore contacts to cache (used when database operation fails)
  restoreContacts: (contacts: LeadContact[]) => {
    const state = get();
    const newCache = { ...state.cache };
    const newOrderedIds = [...state.orderedIds];
    const newDeletedIds = new Set(state._deletedContactIds);
    
    contacts.forEach(contact => {
      // Add contact back to cache
      newCache[contact.id] = contact;
      
      // Add back to ordered IDs if not already present
      if (!newOrderedIds.includes(contact.id)) {
        newOrderedIds.unshift(contact.id); // Add to beginning
      }
      
      // Remove from deleted tracking set
      newDeletedIds.delete(contact.id);
    });
    
    // Update deleted IDs in localStorage
    saveDeletedIds(newDeletedIds);
    
    set({
      cache: newCache,
      orderedIds: newOrderedIds,
      loadedCount: state.loadedCount + contacts.length,
      totalCount: state.totalCount + contacts.length,
      _deletedContactIds: newDeletedIds
    });
    
    logger.log(`Restored ${contacts.length} contacts to store`);
  },
  
  // Pause background loading
  pauseBackgroundLoading: () => {
    logger.log('[ContactsStore] Pausing background loading');
    set({ _backgroundLoadingPaused: true });
  },
  
  // Resume background loading
  resumeBackgroundLoading: () => {
    const state = get();
    logger.log('[ContactsStore] Resuming background loading');
    set({ _backgroundLoadingPaused: false });
    
    // If we have more to load and not currently loading, restart background loading
    if (state.hasMore && !state._backgroundLoadingActive && state._userId && !state.allContactsLoaded) {
      get().startBackgroundLoading();
    }
  }
})); 