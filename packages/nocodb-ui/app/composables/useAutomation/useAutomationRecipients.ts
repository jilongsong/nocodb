"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { SystemUser, TableUserField } from "./recipientTypes";
import { getGlobalApi } from "../useApi";

/**
 * 自动化接收人数据获取 Hook
 * 用于获取系统用户列表和表格用户字段数据
 */

// ==================== API 响应类型 ====================

interface BaseUser {
  id: string;
  email: string;
  display_name?: string;
  avatar?: string;
  roles?: string;
}

interface TableRecord {
  Id: string | number;
  [key: string]: any;
}

interface TableColumn {
  id: string;
  title: string;
  uidt: string;
  meta?: Record<string, any>;
}

// ==================== useSystemUsers Hook ====================

interface UseSystemUsersOptions {
  baseId: string;
  enabled?: boolean;
}

interface UseSystemUsersResult {
  users: SystemUser[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSystemUsers({
  baseId,
  enabled = true,
}: UseSystemUsersOptions): UseSystemUsersResult {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(() => getGlobalApi(), []);

  const fetchUsers = useCallback(async () => {
    if (!baseId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      // 使用 SDK API 获取 base 用户列表
      const response = await api.auth.baseUserList(baseId);
      // API 返回格式是 { users: { list: [...] } } 或 { users: [...] } 或 { list: [...] }
      let rawUsers: any[] = [];
      if (Array.isArray(response)) {
        rawUsers = response;
      } else if ((response as any).users) {
        const usersData = (response as any).users;
        rawUsers = Array.isArray(usersData) ? usersData : (usersData.list || []);
      } else if ((response as any).list) {
        rawUsers = (response as any).list;
      }
      
      const userList: SystemUser[] = rawUsers.map(
        (user: any) => ({
          id: user.id,
          email: user.email,
          display_name: user.display_name || user.email?.split("@")[0],
          avatar: user.avatar,
          roles: user.roles,
        })
      );

      setUsers(userList);
    } catch (err: any) {
      setError(err.message || "获取用户列表失败");
      console.error("Failed to fetch system users:", err);
    } finally {
      setLoading(false);
    }
  }, [api, baseId, enabled]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}

// ==================== useTableUserFields Hook ====================

interface UseTableUserFieldsOptions {
  tableId: string;
  enabled?: boolean;
}

interface UseTableUserFieldsResult {
  userFields: TableUserField[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTableUserFields({
  tableId,
  enabled = true,
}: UseTableUserFieldsOptions): UseTableUserFieldsResult {
  const [userFields, setUserFields] = useState<TableUserField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    if (!tableId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      // 获取表格列信息
      const response = await fetch(`/api/v2/meta/tables/${tableId}/columns`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`获取字段列表失败: ${response.statusText}`);
      }

      const data = await response.json();
      const columns: TableColumn[] = data.list || data.columns || [];

      // 过滤出用户/邮箱类型的字段
      const userFieldList: TableUserField[] = columns
        .filter((col) =>
          ["User", "Email", "Collaborator"].includes(col.uidt)
        )
        .map((col) => ({
          fieldId: col.id,
          fieldTitle: col.title,
          tableId: tableId,
          tableName: "",
          fieldType: col.uidt === "Email" ? "email" as const : "user" as const,
          isMultiple: col.meta?.is_multi || false,
        }));

      setUserFields(userFieldList);
    } catch (err: any) {
      setError(err.message || "获取字段列表失败");
      console.error("Failed to fetch table user fields:", err);
    } finally {
      setLoading(false);
    }
  }, [tableId, enabled]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  return {
    userFields,
    loading,
    error,
    refetch: fetchFields,
  };
}

// ==================== useTableRecords Hook ====================

interface UseTableRecordsOptions {
  baseId: string;
  tableId: string;
  viewId?: string;
  fields?: string[]; // 要获取的字段
  limit?: number;
  enabled?: boolean;
}

// 稳定化 fields 数组的 helper
function useStableFields(fields?: string[]): string | undefined {
  return useMemo(() => fields?.join(","), [fields?.join(",")]);
}

interface UseTableRecordsResult {
  records: TableRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTableRecords({
  baseId,
  tableId,
  viewId,
  fields,
  limit = 100,
  enabled = true,
}: UseTableRecordsOptions): UseTableRecordsResult {
  const [records, setRecords] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(() => getGlobalApi(), []);
  
  // 稳定化 fields 参数，避免无限刷新
  const stableFields = useStableFields(fields);
  // 使用 ref 追踪是否已经请求过
  const fetchedRef = useRef<string>("");

  const fetchRecords = useCallback(async () => {
    if (!baseId || !tableId || !enabled) return;
    
    // 防止重复请求
    const fetchKey = `${baseId}-${tableId}-${viewId}-${stableFields}`;
    if (fetchedRef.current === fetchKey && records.length > 0) return;

    setLoading(true);
    setError(null);

    try {
      const params: any = { limit };
      if (stableFields) {
        params.fields = stableFields;
      }

      // SDK API: dbTableRow.list(orgs, baseName, tableName, query)
      // 使用 baseId 作为 baseName
      const response = await api.dbTableRow.list("noco", baseId, tableId, params);

      setRecords((response.list || []) as TableRecord[]);
      fetchedRef.current = fetchKey;
    } catch (err: any) {
      setError(err.message || "获取记录失败");
      console.error("Failed to fetch table records:", err);
    } finally {
      setLoading(false);
    }
  }, [api, baseId, tableId, viewId, stableFields, limit, enabled, records.length]);

  useEffect(() => {
    if (baseId && tableId && enabled) {
      fetchRecords();
    }
  }, [baseId, tableId, viewId, stableFields, enabled]); // 不依赖 fetchRecords 避免循环

  return {
    records,
    loading,
    error,
    refetch: fetchRecords,
  };
}

// ==================== useAvailableTables Hook ====================

interface UseAvailableTablesOptions {
  baseId: string;
  enabled?: boolean;
}

interface TableInfo {
  id: string;
  title: string;
  type?: string;
}

interface UseAvailableTablesResult {
  tables: TableInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAvailableTables({
  baseId,
  enabled = true,
}: UseAvailableTablesOptions): UseAvailableTablesResult {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(() => getGlobalApi(), []);

  const fetchTables = useCallback(async () => {
    if (!baseId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      // 使用 SDK API 获取表格列表
      const response = await api.dbTable.list(baseId);
      const tableList: TableInfo[] = (response.list || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        type: t.type,
      }));

      setTables(tableList);
    } catch (err: any) {
      setError(err.message || "获取表格列表失败");
      console.error("Failed to fetch tables:", err);
    } finally {
      setLoading(false);
    }
  }, [api, baseId, enabled]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  return {
    tables,
    loading,
    error,
    refetch: fetchTables,
  };
}

// ==================== useTableColumns Hook ====================

interface UseTableColumnsOptions {
  tableId: string;
  enabled?: boolean;
}

interface UseTableColumnsResult {
  columns: TableColumn[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTableColumns({
  tableId,
  enabled = true,
}: UseTableColumnsOptions): UseTableColumnsResult {
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(() => getGlobalApi(), []);

  const fetchColumns = useCallback(async () => {
    if (!tableId || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      // 使用 SDK API 获取表格元数据（包含列信息）
      const response = await api.dbTable.read(tableId);
      const cols = (response.columns || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        uidt: c.uidt,
        meta: c.meta,
      }));
      setColumns(cols);
    } catch (err: any) {
      setError(err.message || "获取列信息失败");
      console.error("Failed to fetch table columns:", err);
    } finally {
      setLoading(false);
    }
  }, [api, tableId, enabled]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  return {
    columns,
    loading,
    error,
    refetch: fetchColumns,
  };
}
