"use client";

import { useState, useCallback, useEffect } from "react";
import type { ColumnType, FilterType, ViewType } from "nocodb-sdk";
import { useApi } from "../useApi";

// Filter comparison operators (matching NocoDB SDK FilterReqType)
export type FilterComparisonOp = 
  | "eq" | "neq" | "like" | "nlike" 
  | "gt" | "gte" | "lt" | "lte" | "ge" | "le"
  | "is" | "isnot" | "in" | "not"
  | "null" | "notnull" | "empty" | "notempty"
  | "checked" | "notchecked"
  | "blank" | "notblank"
  | "allof" | "anyof" | "nallof" | "nanyof"
  | "btw" | "nbtw"
  | "isWithin";

export interface FilterCondition {
  id?: string;
  fk_column_id?: string;
  fk_view_id?: string;
  comparison_op?: FilterComparisonOp;
  comparison_sub_op?: string;
  value?: any;
  logical_op?: "and" | "or";
  is_group?: boolean;
  children?: FilterCondition[];
}

interface UseViewFiltersOptions {
  viewId?: string;
  onReloadData?: () => void;
}

export function useViewFilters({ viewId, onReloadData }: UseViewFiltersOptions) {
  const { api } = useApi({ useGlobalInstance: true });
  
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load filters from API
  const loadFilters = useCallback(async () => {
    if (!viewId) return;
    
    setIsLoading(true);
    try {
      const response = await api.dbTableFilter.read(viewId);
      setFilters((response.list || []) as FilterCondition[]);
    } catch (e) {
      console.error("Failed to load filters:", e);
    } finally {
      setIsLoading(false);
    }
  }, [api, viewId]);

  // Add a new filter
  const addFilter = useCallback(
    async (columnId: string, comparisonOp: FilterComparisonOp = "eq", value: any = "") => {
      if (!viewId) return;

      try {
        const newFilter = await api.dbTableFilter.create(viewId, {
          fk_column_id: columnId,
          comparison_op: comparisonOp as any,
          value,
          logical_op: filters.length > 0 ? "and" : undefined,
        });
        setFilters((prev) => [...prev, newFilter as FilterCondition]);
        onReloadData?.();
      } catch (e) {
        console.error("Failed to add filter:", e);
      }
    },
    [api, viewId, filters.length, onReloadData]
  );

  // Update filter
  const updateFilter = useCallback(
    async (filterId: string, updates: Partial<FilterCondition>) => {
      if (!filterId) return;

      try {
        await api.dbTableFilter.update(filterId, updates as any);
        setFilters((prev) =>
          prev.map((f) => (f.id === filterId ? { ...f, ...updates } : f))
        );
        onReloadData?.();
      } catch (e) {
        console.error("Failed to update filter:", e);
      }
    },
    [api, onReloadData]
  );

  // Delete filter
  const deleteFilter = useCallback(
    async (filterId: string) => {
      if (!filterId) return;

      try {
        await api.dbTableFilter.delete(filterId);
        setFilters((prev) => prev.filter((f) => f.id !== filterId));
        onReloadData?.();
      } catch (e) {
        console.error("Failed to delete filter:", e);
      }
    },
    [api, onReloadData]
  );

  // Delete all filters
  const deleteAllFilters = useCallback(async () => {
    try {
      await Promise.all(filters.map((f) => f.id && api.dbTableFilter.delete(f.id)));
      setFilters([]);
      onReloadData?.();
    } catch (e) {
      console.error("Failed to delete all filters:", e);
    }
  }, [api, filters, onReloadData]);

  // Build filter query string for API calls
  const buildFilterQuery = useCallback((): string => {
    if (filters.length === 0) return "";

    const conditions = filters
      .filter((f) => f.fk_column_id && f.comparison_op)
      .map((f, index) => {
        const prefix = index > 0 ? `~${f.logical_op || "and"}` : "";
        return `${prefix}(${f.fk_column_id},${f.comparison_op},${f.value ?? ""})`;
      });

    return conditions.join("");
  }, [filters]);

  // Load filters when viewId changes
  useEffect(() => {
    if (viewId) {
      loadFilters();
    }
  }, [viewId, loadFilters]);

  return {
    filters,
    isLoading,
    loadFilters,
    addFilter,
    updateFilter,
    deleteFilter,
    deleteAllFilters,
    buildFilterQuery,
  };
}

export type UseViewFiltersReturn = ReturnType<typeof useViewFilters>;
