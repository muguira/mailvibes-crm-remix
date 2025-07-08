import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockContactsById } from "@/components/stream/sample-data";
import { LeadContact } from "@/components/stream/sample-data";
import { useAuth } from "@/components/auth";
import { logger } from "@/utils/logger";

// Constants
export const PAGE_SIZE = 100;
const LEADS_STORAGE_KEY = "leadsRows-v1";

// Types for filters
interface ColumnFilter {
  columnId: string;
  value: any;
  type?: string;
}

interface FilterParams {
  searchTerm?: string;
  columnFilters?: ColumnFilter[];
}

// Local storage fallback functions
const loadRowsFromLocal = (): LeadContact[] => {
  try {
    const savedRows = localStorage.getItem(LEADS_STORAGE_KEY);
    if (savedRows) {
      return JSON.parse(savedRows);
    }
  } catch (error) {
    logger.error("Failed to load rows from localStorage:", error);
  }
  return [];
};

const saveRowsToLocal = (rows: LeadContact[]): void => {
  try {
    localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(rows));
  } catch (error) {
    logger.error("Failed to save rows to localStorage:", error);
  }
};

// Generate dummy leads for testing
const generateDummyLeads = (count: number): LeadContact[] => {
  const leads: LeadContact[] = [];
  const companies = [
    "Acme Corp",
    "Tech Solutions",
    "Global Industries",
    "StartUp Inc",
    "Enterprise Co",
  ];
  const statuses = ["New", "Qualified", "Negotiation", "Deal Won", "Deal Lost"];
  const owners = ["Sarah Johnson", "Mike Chen", "Emily Davis", "John Smith"];

  for (let i = 1; i <= count; i++) {
    const lead: LeadContact = {
      id: `lead-${String(i).padStart(3, "0")}`,
      name: `Contact ${i}`,
      email: `contact${i}@example.com`,
      phone: `+1 (555) ${String(
        Math.floor(Math.random() * 900) + 100
      )}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      company: companies[Math.floor(Math.random() * companies.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      title: `Title ${i}`,
      location: "San Francisco, CA",
      owner: owners[Math.floor(Math.random() * owners.length)],
      lastContacted: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      revenue: Math.floor(Math.random() * 100000),
      industry: "Technology",
    };
    leads.push(lead);
  }

  return leads;
};

export function useLeadsRows() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeadContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Update mockContactsById whenever rows change
  useEffect(() => {
    rows.forEach((row) => {
      mockContactsById[row.id] = row;
    });
  }, [rows]);

  // Fetch data with pagination and filters
  const fetchLeadsRows = useCallback(
    async (
      page: number = 1,
      pageSize: number = PAGE_SIZE,
      filters?: FilterParams
    ) => {
      setLoading(true);

      try {
        // First try to fetch from Supabase using contacts table
        if (user) {
          // Calculate range for pagination
          const from = (page - 1) * pageSize;
          const to = from + pageSize - 1;

          // Start building the query
          let query = supabase
            .from("contacts")
            .select("*", { count: "exact" })
            .eq("user_id", user.id);

          // Apply search filter if provided
          if (filters?.searchTerm) {
            const searchTerm = filters.searchTerm.trim();
            // Search across multiple fields using OR
            query = query.or(
              `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`
            );
          }

          // Apply column filters if provided
          if (filters?.columnFilters && filters.columnFilters.length > 0) {
            for (const filter of filters.columnFilters) {
              const { columnId, value, type } = filter;

              if (
                type === "status" &&
                Array.isArray(value) &&
                value.length > 0
              ) {
                // For status filters with multiple values, use IN
                query = query.in(columnId, value);
              } else if (type === "date" && value) {
                // For date filters
                if (value.start && value.end) {
                  query = query
                    .gte(columnId, value.start)
                    .lte(columnId, value.end);
                } else if (value.start) {
                  query = query.gte(columnId, value.start);
                } else if (value.end) {
                  query = query.lte(columnId, value.end);
                }
              } else if (
                value !== null &&
                value !== undefined &&
                value !== ""
              ) {
                // For other filters, use exact match
                query = query.eq(columnId, value);
              }
            }
          }

          // Apply ordering and pagination
          query = query
            .order("created_at", { ascending: false })
            .range(from, to);

          const { data, error, count } = await query;

          if (error) {
            throw error;
          }

          // Update total count for pagination
          setTotalCount(count || 0);

          // If we have data in Supabase, use it
          if (data && data.length > 0) {
            // Convert contacts to LeadContact format
            const processedRows = data.map((contact) => {
              const leadContact: LeadContact = {
                id: contact.id,
                name: contact.name,
                email: contact.email || "",
                phone: contact.phone || "",
                company: contact.company || "",
                status: contact.status || "",
                // Use existing data field or create empty object
                ...(typeof contact.data === "object" && contact.data !== null
                  ? contact.data
                  : {}),
              };
              return leadContact;
            });

            setRows(processedRows);

            // Keep mockContactsById in sync
            processedRows.forEach((row) => {
              mockContactsById[row.id] = row;
            });
          } else if (
            page === 1 &&
            !filters?.searchTerm &&
            !filters?.columnFilters?.length
          ) {
            // Only generate dummy data on first page with no filters
            const dummyLeads = generateDummyLeads(1000);

            // Save to Supabase contacts table
            try {
              const insertPromises = dummyLeads.map((lead) =>
                supabase.from("contacts").insert({
                  id: lead.id,
                  name: lead.name || "",
                  email: lead.email || "",
                  phone: lead.phone || "",
                  company: lead.company || "",
                  status: lead.status || "",
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
                    revenue: lead.revenue,
                    // etc...
                  },
                })
              );

              await Promise.all(insertPromises);

              // Re-fetch to get the paginated data
              return fetchLeadsRows(page, pageSize, filters);
            } catch (insertError) {
              logger.error("Failed to seed Supabase contacts:", insertError);
            }
          } else {
            // No data found with current filters
            setRows([]);
            setTotalCount(0);
          }
        } else {
          // Not logged in, use localStorage with client-side filtering
          const localRows = loadRowsFromLocal();
          let filteredRows = localRows;

          // Apply search filter
          if (filters?.searchTerm) {
            const searchTerm = filters.searchTerm.trim().toLowerCase();
            filteredRows = filteredRows.filter((row) =>
              Object.values(row).some((value) =>
                String(value).toLowerCase().includes(searchTerm)
              )
            );
          }

          // Apply column filters
          if (filters?.columnFilters && filters.columnFilters.length > 0) {
            filteredRows = filteredRows.filter((row) => {
              return filters.columnFilters!.every((filter) => {
                const value = row[filter.columnId];

                if (filter.type === "status" && Array.isArray(filter.value)) {
                  return filter.value.includes(value);
                } else if (filter.type === "date" && filter.value) {
                  const dateValue = value ? new Date(value) : null;
                  if (!dateValue) return false;

                  if (filter.value.start && filter.value.end) {
                    const start = new Date(filter.value.start);
                    const end = new Date(filter.value.end);
                    return dateValue >= start && dateValue <= end;
                  } else if (filter.value.start) {
                    return dateValue >= new Date(filter.value.start);
                  } else if (filter.value.end) {
                    return dateValue <= new Date(filter.value.end);
                  }
                }

                return value === filter.value;
              });
            });
          }

          // Update total count
          setTotalCount(filteredRows.length);

          // Apply pagination
          const from = (page - 1) * pageSize;
          const to = from + pageSize;
          const paginatedRows = filteredRows.slice(from, to);

          if (paginatedRows.length > 0) {
            setRows(paginatedRows);

            // Keep mockContactsById in sync
            paginatedRows.forEach((row) => {
              mockContactsById[row.id] = row;
            });
          } else if (localRows.length === 0) {
            // Generate new dummy data as last resort
            const dummyLeads = generateDummyLeads(1000);
            saveRowsToLocal(dummyLeads);

            // Re-run with the new data
            return fetchLeadsRows(page, pageSize, filters);
          } else {
            setRows([]);
          }
        }
      } catch (fetchError) {
        logger.error(
          "Error fetching from Supabase, falling back to localStorage:",
          fetchError
        );

        // Fall back to localStorage
        const localRows = loadRowsFromLocal();
        if (localRows.length > 0) {
          // Apply pagination
          const from = (page - 1) * pageSize;
          const to = from + pageSize;
          const paginatedRows = localRows.slice(from, to);

          setRows(paginatedRows);
          setTotalCount(localRows.length);

          // Keep mockContactsById in sync
          paginatedRows.forEach((row) => {
            mockContactsById[row.id] = row;
          });
        } else {
          // Generate new dummy data as last resort
          const dummyLeads = generateDummyLeads(1000);
          saveRowsToLocal(dummyLeads);

          // Apply pagination
          const from = (page - 1) * pageSize;
          const to = from + pageSize;
          const paginatedRows = dummyLeads.slice(from, to);

          setRows(paginatedRows);
          setTotalCount(dummyLeads.length);

          // Keep mockContactsById in sync
          paginatedRows.forEach((lead) => {
            mockContactsById[lead.id] = lead;
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Update a cell value
  const updateCell = async ({
    rowId,
    columnId,
    value,
  }: {
    rowId: string;
    columnId: string;
    value: any;
  }) => {
    try {
      if (user) {
        // Map column names to database fields
        const fieldMap: Record<string, string> = {
          name: "name",
          email: "email",
          phone: "phone",
          company: "company",
          status: "status",
        };

        // Check if this is a main field or should go in data
        if (fieldMap[columnId]) {
          // Update main field
          const { error } = await supabase
            .from("contacts")
            .update({
              [fieldMap[columnId]]: value,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rowId)
            .eq("user_id", user.id);

          if (error) throw error;
        } else {
          // Update in data field
          // First get current data
          const { data: contact, error: fetchError } = await supabase
            .from("contacts")
            .select("data")
            .eq("id", rowId)
            .eq("user_id", user.id)
            .single();

          if (fetchError) throw fetchError;

          // Update the data field
          const updatedData = {
            ...(contact?.data && typeof contact.data === "object"
              ? contact.data
              : {}),
            [columnId]: value,
          };

          const { error: updateError } = await supabase
            .from("contacts")
            .update({ data: updatedData, updated_at: new Date().toISOString() })
            .eq("id", rowId)
            .eq("user_id", user.id);

          if (updateError) throw updateError;
        }

        // Update local state
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.id === rowId ? { ...row, [columnId]: value } : row
          )
        );

        // Update mockContactsById
        if (mockContactsById[rowId]) {
          mockContactsById[rowId] = {
            ...mockContactsById[rowId],
            [columnId]: value,
          };
        }
      }
    } catch (error) {
      logger.error("Failed to update cell:", error);
      throw error;
    }
  };

  // Add a new contact
  const addContact = async (contact: Partial<LeadContact>) => {
    try {
      if (user) {
        const newContact = {
          id: `lead-${Date.now()}`,
          name: contact.name || "",
          email: contact.email || "",
          phone: contact.phone || "",
          company: contact.company || "",
          status: contact.status || "",
          user_id: user.id,
          data: {
            ...contact,
            // Remove fields that are columns in the contacts table
            name: undefined,
            email: undefined,
            phone: undefined,
            company: undefined,
            status: undefined,
          },
        };

        const { error } = await supabase.from("contacts").insert(newContact);

        if (error) throw error;

        // Refresh data
        await fetchLeadsRows(1, PAGE_SIZE);
      }
    } catch (error) {
      logger.error("Failed to add contact:", error);
      throw error;
    }
  };

  // Refresh data
  const refreshData = useCallback(() => {
    fetchLeadsRows(1, PAGE_SIZE);
  }, [fetchLeadsRows]);

  // Initial load
  useEffect(() => {
    fetchLeadsRows(1, PAGE_SIZE);
  }, []);

  return {
    rows,
    loading,
    totalCount,
    updateCell,
    addContact,
    refreshData,
    fetchLeadsRows,
    PAGE_SIZE,
  };
}
