import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { LeadContact } from "@/components/stream/sample-data";
import { logger } from "@/utils/logger";

interface ContactsState {
  // Core data
  cache: Record<string, LeadContact>; // keyed by id
  orderedIds: string[]; // preserve sort order

  // Loading states
  loading: boolean; // background fetch in progress
  hasMore: boolean; // whether more chunks exist
  totalCount: number; // total contacts in database
  loadedCount: number; // contacts loaded so far
  isBackgroundLoading: boolean; // background loading active
  isInitialized: boolean; // whether store has been initialized
  firstBatchLoaded: boolean; // whether first batch is loaded
  allContactsLoaded: boolean; // whether all contacts have been loaded

  // Methods
  fetchNext: () => Promise<void>; // pulls the next chunk
  initialize: (userId: string) => Promise<void>; // initial load
  startBackgroundLoading: () => Promise<void>; // start background loading
  clear: () => void; // clear cache
  removeContacts: (contactIds: string[]) => void; // remove contacts from cache
  restoreContacts: (contacts: LeadContact[]) => void; // restore contacts to cache
  refresh: () => Promise<void>; // refresh data from database
  pauseBackgroundLoading: () => void; // pause background loading
  resumeBackgroundLoading: () => void; // resume background loading

  // Internal state
  _offset: number; // current offset for pagination
  _userId: string | null; // current user ID
  _chunkSize: number; // size of each chunk
  _backgroundLoadingActive: boolean; // track if background loading is running
  _backgroundLoadingPaused: boolean; // whether background loading is paused
  _deletedContactIds: Set<string>; // track deleted contacts to prevent re-adding
}

const FIRST_BATCH_SIZE = 17; // First batch - load immediately (optimized for one page view)
const CHUNK_SIZE = 1000; // Background chunks

// Store the background loading promise outside of the store
let backgroundLoadingPromise: Promise<void> | null = null;
let initializationPromise: Promise<void> | null = null; // Track ongoing initialization

// Load deleted IDs from localStorage
const loadDeletedIds = (): Set<string> => {
  try {
    const stored = localStorage.getItem("deleted-contact-ids");
    if (stored) {
      const ids = JSON.parse(stored);
      logger.log(`Loaded ${ids.length} deleted contact IDs from localStorage`);
      return new Set(ids);
    }
  } catch (error) {
    logger.error("Failed to load deleted contact IDs:", error);
  }
  return new Set<string>();
};

// Save deleted IDs to localStorage
const saveDeletedIds = (deletedIds: Set<string>) => {
  try {
    const deletedArray = Array.from(deletedIds);
    localStorage.setItem("deleted-contact-ids", JSON.stringify(deletedArray));
    logger.log(
      `Persisted ${deletedArray.length} deleted contact IDs to localStorage`
    );
  } catch (error) {
    logger.error("Failed to persist deleted contact IDs:", error);
  }
};

// Global event listener setup - this runs when the store is created
let isEventListenerSetup = false;

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
  _deletedContactIds: loadDeletedIds(),

  // Clear the cache
  clear: () => {
    logger.log(
      "[ContactsStore] Clear called - resetting entire store for logout"
    );

    // Cancel any ongoing background loading
    backgroundLoadingPromise = null;
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
    contactIds.forEach((id) => {
      delete newCache[id];
    });

    // Filter out deleted contacts from orderedIds
    const newOrderedIds = state.orderedIds.filter(
      (id) => !contactIdSet.has(id)
    );

    // Update counts
    const deletedCount = state.orderedIds.length - newOrderedIds.length;
    const newLoadedCount = Math.max(0, state.loadedCount - deletedCount);
    const newTotalCount = Math.max(0, state.totalCount - deletedCount);

    // Add deleted IDs to the tracking set
    const newDeletedIds = new Set(state._deletedContactIds);
    contactIds.forEach((id) => newDeletedIds.add(id));

    // Save deleted IDs to localStorage
    saveDeletedIds(newDeletedIds);

    set({
      cache: newCache,
      orderedIds: newOrderedIds,
      loadedCount: newLoadedCount,
      totalCount: newTotalCount,
      _deletedContactIds: newDeletedIds,
    });

    logger.log(`Removed ${deletedCount} contacts from store`);
  },

  // Initialize with first batch of data
  initialize: async (userId: string) => {
    // If there's already an ongoing initialization, return it
    if (initializationPromise) {
      console.log(
        "[ContactsStore] Initialization already in progress, waiting for it to complete"
      );
      return initializationPromise;
    }

    const state = get();

    // If already initialized for this user, just start background loading if needed
    if (state._userId === userId && state.orderedIds.length > 0) {
      // If we have more to load and not currently loading, start background loading
      if (state.hasMore && !state._backgroundLoadingActive) {
        get().startBackgroundLoading();
      } else if (state.allContactsLoaded) {
        logger.log("All contacts already loaded, no need to reload");
      } else if (state._backgroundLoadingActive) {
        logger.log("Background loading already active");
      }
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
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      set({ totalCount: count || 0 });

      // Fetch first batch
      const { data, error } = await supabase
        .from("contacts")
        .select(
          "id, name, email, phone, company, status, user_id, data, created_at, updated_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(0, 49); // First 50 rows

      if (error) throw error;

      if (data && data.length > 0) {
        const cache: Record<string, LeadContact> = {};
        const orderedIds: string[] = [];

        // Process contacts
        data.forEach((contact) => {
          // Skip if this contact has been deleted
          if (state._deletedContactIds.has(contact.id)) {
            return;
          }

          const contactData = (contact.data as any) || {};
          const leadContact: LeadContact = {
            id: contact.id,
            name: contact.name || "",
            email: contact.email || "",
            phone: contact.phone || "",
            company: contact.company || "",
            status: contact.status || "",
            importListName: contactData.importListName || "",
            importOrder: contactData.importOrder,
            ...contactData,
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
          loading: false,
        });

        logger.log(`Initialized contacts store with ${data.length} contacts`);

        // Start background loading after initial load
        if ((count || 0) > 50) {
          get().startBackgroundLoading();
        }
      } else {
        set({
          loading: false,
          hasMore: false,
          isInitialized: true,
          firstBatchLoaded: true,
          allContactsLoaded: true,
        });
      }
    } catch (error) {
      logger.error("Failed to initialize contacts store:", error);
      set({
        loading: false,
        hasMore: false,
        isInitialized: true,
      });
    }
  },

  // Start background loading process
  startBackgroundLoading: async () => {
    const state = get();

    // If already loading or no more data, return existing promise or resolve
    if (state._backgroundLoadingActive || !state.hasMore || !state._userId) {
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
        // Wait a bit for initial render to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Keep loading while there's more data
        while (get().hasMore && get()._userId === state._userId) {
          // Check if background loading is paused
          if (get()._backgroundLoadingPaused) {
            logger.log("Background loading is paused, waiting...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }

          await get().fetchNext();

          // Small delay between chunks to keep UI responsive
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        logger.log("Background loading complete");
      } catch (error) {
        logger.error("Background loading error:", error);
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

    if (
      state.loading ||
      !state.hasMore ||
      !state._userId ||
      state._backgroundLoadingPaused
    ) {
      return;
    }

    set({ loading: true });

    try {
      const { data, error } = await supabase
        .from("contacts")
        .select(
          "id, name, email, phone, company, status, user_id, data, created_at, updated_at"
        )
        .eq("user_id", state._userId)
        .order("created_at", { ascending: false })
        .range(state._offset, state._offset + state._chunkSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        const newCache = { ...state.cache };
        const newOrderedIds = [...state.orderedIds];
        let skippedCount = 0;
        let addedCount = 0;

        // Process new contacts
        data.forEach((contact) => {
          // Skip if this contact has been deleted
          if (state._deletedContactIds.has(contact.id)) {
            logger.log(
              `[Background Load] Skipping deleted contact: ${contact.id}`
            );
            skippedCount++;
            return;
          }

          const contactData = (contact.data as any) || {};
          const leadContact: LeadContact = {
            id: contact.id,
            name: contact.name || "",
            email: contact.email || "",
            phone: contact.phone || "",
            company: contact.company || "",
            status: contact.status || "",
            importListName: contactData.importListName || "",
            importOrder: contactData.importOrder,
            ...contactData,
          };

          // Only add if not already in cache
          if (!newCache[contact.id]) {
            newCache[contact.id] = leadContact;
            newOrderedIds.push(contact.id);
            addedCount++;
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
          loading: false,
        });

        logger.log(
          `Loaded chunk: ${data.length} contacts (total: ${newLoadedCount}/${state.totalCount})`
        );
      } else {
        set({
          hasMore: false,
          loading: false,
          allContactsLoaded: true,
        });
        logger.log("No more contacts to load");
      }
    } catch (error) {
      logger.error("Failed to fetch next chunk:", error);
      set({ loading: false });
    }
  },

  // Refresh data from database
  refresh: async () => {
    const state = get();

    if (!state._userId) {
      console.log("❌ No user ID in store, cannot refresh");
      return;
    }

    console.log("🔄 Starting contacts store refresh...");
    logger.log("Refreshing contacts data...");

    // Clear current data and reinitialize
    get().clear();
    console.log("🧹 Store cleared, reinitializing...");
    await get().initialize(state._userId);

    console.log("✅ Contacts store refreshed successfully");
    logger.log("Contacts data refreshed");
  },

  // Restore contacts to cache
  restoreContacts: (contacts: LeadContact[]) => {
    const state = get();
    const newCache = { ...state.cache };
    const newOrderedIds = [...state.orderedIds];
    let addedCount = 0;

    // Remove contacts from deleted IDs set (they're being restored)
    const newDeletedIds = new Set(state._deletedContactIds);
    contacts.forEach((contact) => {
      if (newDeletedIds.has(contact.id)) {
        newDeletedIds.delete(contact.id);
      }
    });

    // Save updated deleted IDs to localStorage
    saveDeletedIds(newDeletedIds);

    // Process new contacts
    contacts.forEach((contact) => {
      // Only add if not already in cache
      if (!newCache[contact.id]) {
        newCache[contact.id] = contact;
        newOrderedIds.push(contact.id);
        addedCount++;
      }
    });

    const newLoadedCount = state.loadedCount + contacts.length;
    const hasMore = newLoadedCount < state.totalCount;

    set({
      cache: newCache,
      orderedIds: newOrderedIds,
      loadedCount: newLoadedCount,
      totalCount: state.totalCount,
      hasMore,
      _deletedContactIds: newDeletedIds,
    });

    logger.log(
      `Restored ${addedCount} contacts to store (total: ${newLoadedCount}/${state.totalCount})`
    );
  },

  // Pause background loading
  pauseBackgroundLoading: () => {
    const state = get();
    set({ _backgroundLoadingPaused: true });
  },

  // Resume background loading
  resumeBackgroundLoading: () => {
    const state = get();
    set({ _backgroundLoadingPaused: false });
  },
}));

// Setup global event listener when store is created
if (!isEventListenerSetup) {
  const handleContactAdded = () => {
    console.log("🔥 CONTACT-ADDED EVENT RECEIVED in global store listener");
    const store = useContactsStore.getState();
    if (store._userId) {
      console.log("🔄 Triggering store refresh from global listener...");
      store.refresh();
    } else {
      console.log(
        "❌ No user ID in store, cannot refresh from global listener"
      );
    }
  };

  document.addEventListener("contact-added", handleContactAdded);
  console.log("✅ Global contact-added listener added to store");
  isEventListenerSetup = true;
}
