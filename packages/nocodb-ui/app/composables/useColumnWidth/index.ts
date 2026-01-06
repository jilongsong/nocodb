"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY_PREFIX = "nc_column_widths_";

interface UseColumnWidthOptions {
  viewId?: string;
  tableId: string;
}

export function useColumnWidth({ viewId, tableId }: UseColumnWidthOptions) {
  const storageKey = `${STORAGE_KEY_PREFIX}${viewId || tableId}`;
  
  // Initialize state from localStorage
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Sync to localStorage when widths change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (Object.keys(columnWidths).length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(columnWidths));
      }
    } catch (e) {
      console.error("Failed to save column widths to localStorage:", e);
    }
  }, [columnWidths, storageKey]);

  // Get column width
  const getColumnWidth = useCallback(
    (columnId: string, defaultWidth = 180): number => {
      return columnWidths[columnId] ?? defaultWidth;
    },
    [columnWidths]
  );

  // Set column width
  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnId]: width,
    }));
  }, []);

  // Set multiple column widths
  const setColumnWidths_ = useCallback((widths: Record<string, number>) => {
    setColumnWidths((prev) => ({
      ...prev,
      ...widths,
    }));
  }, []);

  // Reset column width
  const resetColumnWidth = useCallback((columnId: string) => {
    setColumnWidths((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  }, []);

  // Reset all column widths
  const resetAllColumnWidths = useCallback(() => {
    setColumnWidths({});
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  }, [storageKey]);

  return {
    columnWidths,
    getColumnWidth,
    setColumnWidth,
    setColumnWidths: setColumnWidths_,
    resetColumnWidth,
    resetAllColumnWidths,
  };
}

export type UseColumnWidthReturn = ReturnType<typeof useColumnWidth>;
