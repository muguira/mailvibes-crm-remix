import { useState, useCallback } from "react";
import { useAuth } from "@/components/auth";
import { supabase } from "@/integrations/supabase/client";
import debounce from "lodash/debounce";

interface SearchContact {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
}

export function useContactSearch() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<SearchContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, company, email")
        .order("name", { ascending: true })
        .limit(100);

      if (error) throw error;

      setContacts(data || []);
      setHasInitialized(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching contacts"
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Remove automatic fetching - only fetch when explicitly requested

  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        const trimmedSearchTerm = searchTerm.trim();
        const { data, error } = await supabase
          .from("contacts")
          .select("id, name, company, email")
          .or(
            `name.ilike.%${trimmedSearchTerm}%,email.ilike.%${trimmedSearchTerm}%,company.ilike.%${trimmedSearchTerm}%`
          )
          .order("name", { ascending: true })
          .limit(100);

        if (error) throw error;

        setContacts(data || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while searching contacts"
        );
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [user]
  );

  const searchContacts = useCallback(
    (searchTerm: string) => {
      if (searchTerm.trim() === "") {
        // Only fetch if we haven't initialized yet
        if (!hasInitialized) {
          fetchContacts();
        }
      } else {
        debouncedSearch(searchTerm);
      }
    },
    [fetchContacts, debouncedSearch, hasInitialized]
  );

  return {
    contacts,
    isLoading,
    error,
    searchContacts,
    hasInitialized,
  };
}
