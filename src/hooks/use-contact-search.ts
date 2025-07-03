import { useEffect, useState, useCallback } from "react";
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

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const debouncedSearch = useCallback(
    debounce(async (searchTerm: string) => {
      if (!user) return;

      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("contacts")
          .select("id, name, company, email")
          .or(
            `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`
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
        fetchContacts();
      } else {
        debouncedSearch(searchTerm);
      }
    },
    [fetchContacts, debouncedSearch]
  );

  return {
    contacts,
    isLoading,
    error,
    searchContacts,
  };
}
