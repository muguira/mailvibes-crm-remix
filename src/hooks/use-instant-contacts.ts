import { useEffect, useMemo } from "react";
import { useContactsStore } from "@/stores/contactsStore";
import { useAuth } from "@/components/auth";
import { LeadContact } from "@/components/stream/sample-data";
import { mockContactsById } from "@/components/stream/sample-data";

interface ColumnFilter {
  columnId: string;
  value: any;
  type?: string;
  operator?: string;
}

interface UseInstantContactsOptions {
  searchTerm: string;
  pageSize: number;
  currentPage: number;
  columnFilters?: ColumnFilter[];
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
  columnFilters = [],
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
      console.log(
        "[useInstantContacts] Initializing contacts store for user:",
        user.id
      );
      initialize(user.id);
    } else if (user?.id && isInitialized) {
      console.log(
        "[useInstantContacts] Store already initialized, skipping initialization"
      );
    }
  }, [user?.id, isInitialized, initialize]);

  // Update mockContactsById whenever cache changes
  useEffect(() => {
    Object.entries(cache).forEach(([id, contact]) => {
      mockContactsById[id] = contact;
    });
  }, [cache]);

  // Filter contacts based on search term and column filters
  const filteredIds = useMemo(() => {
    let filtered = orderedIds;

    // Apply search term filter
    if (searchTerm && searchTerm.trim() !== "") {
      const query = searchTerm.trim().toLowerCase();
      filtered = filtered.filter((id) => {
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
    }

    // Apply column filters
    if (columnFilters && columnFilters.length > 0) {
      filtered = filtered.filter((id) => {
        const contact = cache[id];
        if (!contact) return false;

        return columnFilters.every((filter) => {
          const { columnId, value, type, operator } = filter;
          const cellValue = contact[columnId as keyof LeadContact];

          if (type === "status" && Array.isArray(value)) {
            return value.includes(cellValue);
          } else if (type === "dropdown") {
            if (Array.isArray(value) && value.length > 0) {
              // Multi-select dropdown filter
              return value.includes(cellValue);
            } else if (value && value !== "") {
              // Single-select dropdown filter
              return cellValue === value;
            }
          } else if (type === "date") {
            console.log("Processing date filter in useInstantContacts:", {
              columnId,
              operator,
              value,
              cellValue,
              cellValueType: typeof cellValue,
            });

            if (operator === "is_empty") {
              const isEmpty = !cellValue || cellValue === "";
              console.log("Date is_empty check:", { cellValue, isEmpty });
              return isEmpty;
            } else if (operator === "is_not_empty") {
              const isNotEmpty = cellValue && cellValue !== "";
              console.log("Date is_not_empty check:", {
                cellValue,
                isNotEmpty,
              });
              return isNotEmpty;
            } else if (value) {
              const dateValue = cellValue
                ? new Date(cellValue as string)
                : null;
              console.log("Date comparison:", {
                originalCellValue: cellValue,
                parsedDateValue: dateValue,
                isValidDate: dateValue && !isNaN(dateValue.getTime()),
                filterValue: value,
              });

              if (!dateValue || isNaN(dateValue.getTime())) {
                console.log("Invalid date value, excluding from results");
                return false;
              }

              if (value.start && value.end) {
                const start = new Date(value.start);
                const end = new Date(value.end);

                // For "on" operator, we need to check if the date falls within the same day
                if (operator === "on" && value.start === value.end) {
                  // Compare just the date part (YYYY-MM-DD)
                  const dateStr = dateValue.toISOString().split("T")[0];
                  const filterDateStr = start.toISOString().split("T")[0];
                  const result = dateStr === filterDateStr;
                  console.log('Date "on" comparison:', {
                    dateStr,
                    filterDateStr,
                    result,
                  });
                  return result;
                }

                // For between dates, include both start and end dates
                const result = dateValue >= start && dateValue <= end;
                console.log("Date range comparison:", {
                  dateValue: dateValue.toISOString(),
                  start: start.toISOString(),
                  end: end.toISOString(),
                  result,
                });
                return result;
              } else if (value.start) {
                const start = new Date(value.start);
                const result = dateValue >= start;
                console.log("Date after comparison:", {
                  dateValue: dateValue.toISOString(),
                  start: start.toISOString(),
                  result,
                });
                return result;
              } else if (value.end) {
                const end = new Date(value.end);
                const result = dateValue <= end;
                console.log("Date before comparison:", {
                  dateValue: dateValue.toISOString(),
                  end: end.toISOString(),
                  result,
                });
                return result;
              }
            }

            console.log("Date filter did not match any condition, excluding");
            return false;
          } else if (type === "text" && operator) {
            const textValue = String(cellValue || "").toLowerCase();
            const searchValue = String(value || "").toLowerCase();

            if (operator === "is_empty") {
              return !cellValue || cellValue === "";
            } else if (operator === "is_not_empty") {
              return cellValue && cellValue !== "";
            } else if (operator === "contains") {
              return textValue.includes(searchValue);
            } else if (operator === "equals") {
              return textValue === searchValue;
            } else if (operator === "starts_with") {
              return textValue.startsWith(searchValue);
            } else if (operator === "ends_with") {
              return textValue.endsWith(searchValue);
            }
          } else if (type === "number" && operator) {
            const numValue = cellValue ? parseFloat(cellValue as string) : null;

            if (operator === "is_empty") {
              return numValue === null || numValue === undefined;
            } else if (operator === "is_not_empty") {
              return numValue !== null && numValue !== undefined;
            } else if (numValue !== null && numValue !== undefined) {
              if (operator === "equals") {
                return numValue === value;
              } else if (operator === "greater_than") {
                return numValue > value;
              } else if (operator === "less_than") {
                return numValue < value;
              } else if (operator === "greater_equal") {
                return numValue >= value;
              } else if (operator === "less_equal") {
                return numValue <= value;
              } else if (
                operator === "between" &&
                value.min !== undefined &&
                value.max !== undefined
              ) {
                return numValue >= value.min && numValue <= value.max;
              }
            }
          } else if (!operator) {
            // Backward compatibility for filters without operators
            return cellValue === value;
          }

          return false;
        });
      });
    }

    return filtered;
  }, [searchTerm, columnFilters, orderedIds, cache]);

  // Paginate filtered results - this will re-run when filteredIds or cache change
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const rows = filteredIds
      .slice(startIndex, endIndex)
      .map((id) => cache[id])
      .filter(Boolean); // Remove any undefined entries

    console.log(
      `[useInstantContacts] Returning ${rows.length} paginated rows from ${filteredIds.length} filtered contacts (${columnFilters.length} filters applied)`
    );
    return rows;
  }, [filteredIds, currentPage, pageSize, cache, columnFilters.length]);

  return {
    rows: paginatedRows,
    loading: loading && orderedIds.length === 0, // Only show loading on initial load
    totalCount: filteredIds.length, // Use actual loaded and filtered count for pagination
    isBackgroundLoading,
    loadedCount,
  };
}
