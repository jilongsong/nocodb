"use client";

import { useState, useCallback, useEffect } from "react";
import type { ColumnType, SortType, ViewType } from "nocodb-sdk";
import { useApi } from "../useApi";

interface UseViewSortsOptions {
  viewId?: string;
  onReloadData?: () => void;
}

export function useViewSorts({ viewId, onReloadData }: UseViewSortsOptions) {
  const { api } = useApi({ useGlobalInstance: true });
  
  const [sorts, setSorts] = useState<SortType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load sorts from API
  const loadSorts = useCallback(async () => {
    if (!viewId) return;
    
    setIsLoading(true);
    try {
      const response = await api.dbTableSort.list(viewId);
      setSorts((response.list || []) as SortType[]);
    } catch (e) {
      console.error("Failed to load sorts:", e);
    } finally {
      setIsLoading(false);
    }
  }, [api, viewId]);

  // Add a new sort
  const addSort = useCallback(
    async (columnId: string, direction: "asc" | "desc" = "asc") => {
      if (!viewId) return;

      try {
        const newSort = await api.dbTableSort.create(viewId, {
          fk_column_id: columnId,
          direction,
        });
        setSorts((prev) => [...prev, newSort as SortType]);
        onReloadData?.();
      } catch (e) {
        console.error("Failed to add sort:", e);
      }
    },
    [api, viewId, onReloadData]
  );

  // Insert sort (from column header menu) - replaces existing sort on same column
  const insertSort = useCallback(
    async (column: ColumnType, direction: "asc" | "desc") => {
      if (!viewId || !column.id) return;

      try {
        // Check if sort already exists for this column
        const existingSort = sorts.find((s) => s.fk_column_id === column.id);
        
        if (existingSort?.id) {
          // Delete existing sort first
          await api.dbTableSort.delete(existingSort.id);
        }

        // Create new sort with push_to_top
        const newSort = await api.dbTableSort.create(viewId, {
          fk_column_id: column.id,
          direction,
          push_to_top: true,
        });

        setSorts((prev) => {
          const filtered = prev.filter((s) => s.fk_column_id !== column.id);
          return [newSort as SortType, ...filtered];
        });
        
        onReloadData?.();
      } catch (e) {
        console.error("Failed to insert sort:", e);
      }
    },
    [api, viewId, sorts, onReloadData]
  );

  // Update sort
  const updateSort = useCallback(
    async (sortId: string, updates: Partial<SortType>) => {
      if (!sortId) return;

      try {
        await api.dbTableSort.update(sortId, updates);
        setSorts((prev) =>
          prev.map((s) => (s.id === sortId ? { ...s, ...updates } : s))
        );
        onReloadData?.();
      } catch (e) {
        console.error("Failed to update sort:", e);
      }
    },
    [api, onReloadData]
  );

  // Delete sort
  const deleteSort = useCallback(
    async (sortId: string) => {
      if (!sortId) return;

      try {
        await api.dbTableSort.delete(sortId);
        setSorts((prev) => prev.filter((s) => s.id !== sortId));
        onReloadData?.();
      } catch (e) {
        console.error("Failed to delete sort:", e);
      }
    },
    [api, onReloadData]
  );

  // Delete all sorts
  const deleteAllSorts = useCallback(async () => {
    try {
      await Promise.all(sorts.map((s) => s.id && api.dbTableSort.delete(s.id)));
      setSorts([]);
      onReloadData?.();
    } catch (e) {
      console.error("Failed to delete all sorts:", e);
    }
  }, [api, sorts, onReloadData]);

  // Load sorts when viewId changes
  useEffect(() => {
    if (viewId) {
      loadSorts();
    }
  }, [viewId, loadSorts]);

  return {
    sorts,
    isLoading,
    loadSorts,
    addSort,
    insertSort,
    updateSort,
    deleteSort,
    deleteAllSorts,
  };
}

export type UseViewSortsReturn = ReturnType<typeof useViewSorts>;
