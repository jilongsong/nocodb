"use client";

import {
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useApi } from "../useApi";
import type {
  Automation,
  AutomationLog,
  AutomationState,
  UseAutomationReturn,
  CreateAutomationRequest,
  UpdateAutomationRequest,
  TestAutomationRequest,
  TestAutomationResponse,
} from "./types";

// ==================== Context ====================

const AutomationContext = createContext<UseAutomationReturn | null>(null);

// ==================== Provider ====================

interface AutomationProviderProps {
  children: ReactNode;
  baseId?: string;
}

export function AutomationProvider({
  children,
  baseId,
}: AutomationProviderProps) {
  const value = useAutomationInternal(baseId);
  return (
    <AutomationContext.Provider value={value}>
      {children}
    </AutomationContext.Provider>
  );
}

// ==================== Hook ====================

export function useAutomation(baseId?: string): UseAutomationReturn {
  const context = useContext(AutomationContext);
  const standalone = useAutomationInternal(baseId);
  return context || standalone;
}

// ==================== 内部实现 ====================

function useAutomationInternal(_baseId?: string): UseAutomationReturn {
  const { api } = useApi({ useGlobalInstance: true });

  // State
  const [automations, setAutomations] = useState<Map<string, Automation>>(
    new Map()
  );
  const [currentAutomation, setCurrentAutomation] =
    useState<Automation | null>(null);
  const [automationLogs, setAutomationLogs] = useState<
    Map<string, AutomationLog[]>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== 计算属性 ====================

  const automationsList = useMemo(() => {
    return Array.from(automations.values()).sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [automations]);

  const activeAutomations = useMemo(() => {
    return automationsList.filter((a) => a.is_active);
  }, [automationsList]);

  const tableAutomations = useCallback(
    (tableId: string) => {
      return automationsList.filter((a) => a.fk_model_id === tableId);
    },
    [automationsList]
  );

  // ==================== Actions ====================

  const loadAutomations = useCallback(
    async (params: {
      baseId: string;
      tableId?: string;
      page?: number;
      pageSize?: number;
    }): Promise<Automation[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.instance.get<{
          list: Automation[];
          pageInfo: { totalRows: number };
        }>(`/api/v3/meta/bases/${params.baseId}/automations`, {
          params: {
            fk_model_id: params.tableId,
            page: params.page || 1,
            pageSize: params.pageSize || 25,
          },
        });

        const list = response.data?.list || [];

        setAutomations((prev) => {
          const newMap = new Map(prev);
          list.forEach((automation) => {
            newMap.set(automation.id, automation);
          });
          return newMap;
        });

        return list;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load automations";
        setError(message);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const loadAutomation = useCallback(
    async (baseId: string, id: string): Promise<Automation | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.instance.get<Automation>(
          `/api/v3/meta/bases/${baseId}/automations/${id}`
        );

        const automation = response.data;

        if (automation) {
          setAutomations((prev) => {
            const newMap = new Map(prev);
            newMap.set(automation.id, automation);
            return newMap;
          });
          setCurrentAutomation(automation);
        }

        return automation;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load automation";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const createAutomation = useCallback(
    async (
      targetBaseId: string,
      data: CreateAutomationRequest
    ): Promise<Automation> => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await api.instance.post<Automation>(
          `/api/v3/meta/bases/${targetBaseId}/automations`,
          data
        );

        const automation = response.data;

        setAutomations((prev) => {
          const newMap = new Map(prev);
          newMap.set(automation.id, automation);
          return newMap;
        });

        return automation;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to create automation";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [api]
  );

  const updateAutomation = useCallback(
    async (baseId: string, id: string, data: UpdateAutomationRequest): Promise<Automation> => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await api.instance.patch<Automation>(
          `/api/v3/meta/bases/${baseId}/automations/${id}`,
          data
        );

        const automation = response.data;

        setAutomations((prev) => {
          const newMap = new Map(prev);
          newMap.set(automation.id, automation);
          return newMap;
        });

        if (currentAutomation?.id === id) {
          setCurrentAutomation(automation);
        }

        return automation;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to update automation";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [api, currentAutomation]
  );

  const deleteAutomation = useCallback(
    async (baseId: string, id: string): Promise<void> => {
      setIsSaving(true);
      setError(null);

      try {
        await api.instance.delete(`/api/v3/meta/bases/${baseId}/automations/${id}`);

        setAutomations((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });

        if (currentAutomation?.id === id) {
          setCurrentAutomation(null);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete automation";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [api, currentAutomation]
  );

  const duplicateAutomation = useCallback(
    async (baseId: string, id: string): Promise<Automation> => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await api.instance.post<Automation>(
          `/api/v3/meta/bases/${baseId}/automations/${id}/duplicate`
        );

        const automation = response.data;

        setAutomations((prev) => {
          const newMap = new Map(prev);
          newMap.set(automation.id, automation);
          return newMap;
        });

        return automation;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to duplicate automation";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [api]
  );

  const toggleActive = useCallback(
    async (baseId: string, id: string, active: boolean): Promise<Automation> => {
      return updateAutomation(baseId, id, { is_active: active });
    },
    [updateAutomation]
  );

  const testAutomation = useCallback(
    async (
      baseId: string,
      id: string,
      data?: TestAutomationRequest
    ): Promise<TestAutomationResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.instance.post<TestAutomationResponse>(
          `/api/v3/meta/bases/${baseId}/automations/${id}/test`,
          data || {}
        );

        return response.data;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to test automation";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const triggerAutomation = useCallback(
    async (baseId: string, id: string, recordId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await api.instance.post(`/api/v3/meta/bases/${baseId}/automations/${id}/trigger`, {
          record_id: recordId,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to trigger automation";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [api]
  );

  const loadAutomationLogs = useCallback(
    async (params: {
      baseId: string;
      automationId: string;
      page?: number;
      pageSize?: number;
    }): Promise<AutomationLog[]> => {
      setIsLoadingLogs(true);
      setError(null);

      try {
        const response = await api.instance.get<{
          list: AutomationLog[];
          pageInfo: { totalRows: number };
        }>(`/api/v3/meta/bases/${params.baseId}/automations/${params.automationId}/logs`, {
          params: {
            page: params.page || 1,
            pageSize: params.pageSize || 25,
          },
        });

        const list = response.data?.list || [];

        setAutomationLogs((prev) => {
          const newMap = new Map(prev);
          newMap.set(params.automationId, list);
          return newMap;
        });

        return list;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load logs";
        setError(message);
        return [];
      } finally {
        setIsLoadingLogs(false);
      }
    },
    [api]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setAutomations(new Map());
    setCurrentAutomation(null);
    setAutomationLogs(new Map());
    setIsLoading(false);
    setIsLoadingLogs(false);
    setIsSaving(false);
    setError(null);
  }, []);

  return {
    automations,
    currentAutomation,
    automationLogs,
    isLoading,
    isLoadingLogs,
    isSaving,
    error,
    automationsList,
    activeAutomations,
    tableAutomations,
    loadAutomations,
    loadAutomation,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    duplicateAutomation,
    toggleActive,
    testAutomation,
    triggerAutomation,
    loadAutomationLogs,
    setCurrentAutomation,
    clearError,
    reset,
  };
}

export * from "./types";
