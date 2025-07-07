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

  const {
    cache,
    orderedIds,
    loading,
    totalCount,
    loadedCount,
    isBackgroundLoading,
    initialize,
    removeContacts,
  } = useContactsStore();

  // Initialize store when user is available
  // The store will handle background loading automatically
  useEffect(() => {
    if (user?.id) {
      initialize(user.id);
    }
  }, [user?.id, initialize]);

  // Update mockContactsById whenever cache changes
  useEffect(() => {
    Object.entries(cache).forEach(([id, contact]) => {
      mockContactsById[id] = contact;
    });
  }, [cache]);

  // Listen for contacts-deleted events to keep store in sync
  useEffect(() => {
    const handleContactsDeleted = (event: CustomEvent) => {
      // The event detail might contain the deleted contact IDs
      const deletedIds = event.detail?.contactIds;
      if (deletedIds && Array.isArray(deletedIds)) {
        removeContacts(deletedIds);
      }
    };

    document.addEventListener(
      "contacts-deleted",
      handleContactsDeleted as EventListener
    );

    return () => {
      document.removeEventListener(
        "contacts-deleted",
        handleContactsDeleted as EventListener
      );
    };
  }, [removeContacts]);

  // Contact-added events are now handled globally by the store itself
  // No need for component-level listeners that could miss events due to timing

  // Filter contacts based on search term
  const filteredIds = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") {
      return orderedIds;
    }

    const query = searchTerm.toLowerCase();
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

  // Paginate filtered results
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return filteredIds
      .slice(startIndex, endIndex)
      .map((id) => cache[id])
      .filter(Boolean); // Remove any undefined entries
  }, [filteredIds, currentPage, pageSize, cache]);

  return {
    rows: paginatedRows,
    loading: loading && orderedIds.length === 0, // Only show loading on initial load
    totalCount: searchTerm ? filteredIds.length : totalCount,
    isBackgroundLoading,
    loadedCount,
  };
}
