import { useState, useMemo } from "react";
import { useDebounce } from "./use-debounce";

interface FilterConfig<T> {
  searchFields: (keyof T)[];
  customFilters?: Record<string, (item: T, value: any) => boolean>;
}

export function useFilteredData<T>(
  data: T[],
  config: FilterConfig<T>,
  searchDelay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, any>>({});

  const debouncedSearch = useDebounce(searchTerm, searchDelay);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (debouncedSearch) {
      filtered = filtered.filter((item) =>
        config.searchFields.some((field) => {
          const value = item[field];
          if (typeof value === "string") {
            return value.toLowerCase().includes(debouncedSearch.toLowerCase());
          }
          return false;
        })
      );
    }

    if (config.customFilters) {
      Object.entries(filters).forEach(([filterKey, filterValue]) => {
        if (filterValue && filterValue !== "all") {
          const filterFunction = config.customFilters![filterKey];
          if (filterFunction) {
            filtered = filtered.filter((item) =>
              filterFunction(item, filterValue)
            );
          }
        }
      });
    }

    return filtered;
  }, [data, debouncedSearch, filters, config]);

  const updateFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({});
  };

  return {
    filteredData,
    searchTerm,
    setSearchTerm,
    filters,
    updateFilter,
    clearFilters,
  };
}
