import { useEffect, useMemo } from "react";
import { useContactsStore } from "@/stores/contactsStore";
import { useAuth } from "@/components/auth";
import { LeadContact } from "@/components/stream/sample-data";
import { mockContactsById } from "@/components/stream/sample-data";

interface UseInstantContactsOptions {
  searchTerm: string;
  pageSize: number;
  currentPage: number;
}

interface UseInstantContactsReturn {
  rows: LeadContact[];
  loading: boolean;
  totalCount: number;
  isBackgroundLoading: boolean;
  loadedCount: number;
}

export function useInstantContacts({
  searchTerm,
  pageSize,
  currentPage,
}: UseInstantContactsOptions): UseInstantContactsReturn {
  const { user } = useAuth();

  // Subscribe to all contacts store state changes
  const {
    cache,
    orderedIds,
    loading,
    totalCount,
    loadedCount,
    isBackgroundLoading,
    isInitialized,
    initialize,
  } = useContactsStore();

  // Initialize store when user is available - but only if not already initialized
  useEffect(() => {
    if (user?.id && !isInitialized) {
      console.log('[useInstantContacts] Initializing contacts store for user:', user.id);
      initialize(user.id);
    } else if (user?.id && isInitialized) {
      console.log('[useInstantContacts] Store already initialized, skipping initialization');
    }
  }, [user?.id, isInitialized, initialize]);

  // Update mockContactsById whenever cache changes
  useEffect(() => {
    Object.entries(cache).forEach(([id, contact]) => {
      mockContactsById[id] = contact;
    });
  }, [cache]);

  // Filter contacts based on search term - this will re-run when cache or orderedIds change
  const filteredIds = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") {
      return orderedIds;
    }

    const query = searchTerm.trim().toLowerCase();
    return orderedIds.filter((id) => {
      const contact = cache[id];
      if (!contact) return false;

      // Search in name, email, company, and phone
      return (
        contact.name?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query)
      );
    });
  }, [searchTerm, orderedIds, cache]);

  // Paginate filtered results - this will re-run when filteredIds or cache change
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const rows = filteredIds
      .slice(startIndex, endIndex)
      .map((id) => cache[id])
      .filter(Boolean); // Remove any undefined entries
    
    console.log(`[useInstantContacts] Returning ${rows.length} paginated rows from ${filteredIds.length} filtered contacts`);
    return rows;
  }, [filteredIds, currentPage, pageSize, cache]);

  return {
    rows: paginatedRows,
    loading: loading && orderedIds.length === 0, // Only show loading on initial load
    totalCount: filteredIds.length, // Use actual loaded and filtered count for pagination
    isBackgroundLoading,
    loadedCount,
  };
}
