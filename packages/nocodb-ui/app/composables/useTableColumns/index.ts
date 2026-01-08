"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useApi } from "../useApi";

/**
 * 列/字段信息类型 - 与后端 Column 模型对应
 */
export interface ColumnInfo {
  id: string;
  title: string;
  column_name: string;
  uidt: string;  // UI Data Type: SingleLineText, Number, Date, etc.
  dt?: string;   // Database type
  pv?: boolean;  // Primary value (display column)
  pk?: boolean;  // Primary key
  rqd?: boolean; // Required
  system?: boolean;
  order?: number;
  meta?: Record<string, any>;
  // 关联字段信息
  colOptions?: {
    fk_related_model_id?: string;
    fk_child_column_id?: string;
    fk_parent_column_id?: string;
    type?: string;
  };
}

/**
 * 简化的字段信息 - 用于选择器
 */
export interface FieldInfo {
  id: string;
  title: string;
  uidt: string;
  pv?: boolean;
  system?: boolean;
  rqd?: boolean;
}

/**
 * 字段类型分类
 */
export const FIELD_CATEGORIES = {
  text: ["SingleLineText", "LongText", "Email", "URL", "PhoneNumber"],
  number: ["Number", "Decimal", "Currency", "Percent", "Duration", "Rating"],
  date: ["Date", "DateTime", "Time", "Year"],
  select: ["SingleSelect", "MultiSelect"],
  relation: ["LinkToAnotherRecord", "Links"],
  computed: ["Formula", "Rollup", "Lookup"],
  media: ["Attachment", "Barcode", "QrCode"],
  user: ["User", "CreatedBy", "LastModifiedBy"],
  other: ["Checkbox", "Button", "GeoData", "JSON"],
} as const;

/**
 * 字段类型标签
 */
export const FIELD_TYPE_LABELS: Record<string, string> = {
  SingleLineText: "文本",
  LongText: "长文本",
  Number: "数字",
  Decimal: "小数",
  Currency: "货币",
  Percent: "百分比",
  Date: "日期",
  DateTime: "日期时间",
  Time: "时间",
  Year: "年份",
  Duration: "时长",
  Rating: "评分",
  Email: "邮箱",
  URL: "链接",
  PhoneNumber: "电话",
  Checkbox: "勾选框",
  SingleSelect: "单选",
  MultiSelect: "多选",
  Attachment: "附件",
  User: "用户",
  CreatedBy: "创建人",
  LastModifiedBy: "修改人",
  LinkToAnotherRecord: "关联",
  Links: "关联",
  Lookup: "查找引用",
  Rollup: "汇总",
  Formula: "公式",
  Barcode: "条形码",
  QrCode: "二维码",
  GeoData: "地理位置",
  Button: "按钮",
  JSON: "JSON",
};

interface UseTableColumnsOptions {
  autoLoad?: boolean;
  excludeSystem?: boolean;
  excludeComputed?: boolean;
}

interface UseTableColumnsReturn {
  columns: ColumnInfo[];
  fields: FieldInfo[];
  loading: boolean;
  error: string | null;
  loadColumns: (tableId: string) => Promise<ColumnInfo[]>;
  getFieldById: (id: string) => FieldInfo | undefined;
  getEditableFields: () => FieldInfo[];
  getFieldsByType: (types: string[]) => FieldInfo[];
}

/**
 * 获取表格列/字段的 Hook
 */
export function useTableColumns(
  tableId?: string,
  options: UseTableColumnsOptions = {}
): UseTableColumnsReturn {
  const { autoLoad = true, excludeSystem = true, excludeComputed = false } = options;
  const { api } = useApi({ useGlobalInstance: true });

  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载列数据
  const loadColumns = useCallback(async (tid: string): Promise<ColumnInfo[]> => {
    if (!tid) return [];

    setLoading(true);
    setError(null);

    try {
      // 使用 NocoDB API v2 获取表格信息（包含 columns）
      const response = await api.instance.get(`/api/v2/meta/tables/${tid}`);
      const data = response.data;
      
      // 从表格信息中提取 columns
      let cols: ColumnInfo[] = data?.columns || [];

      // 按 order 排序
      cols.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

      setColumns(cols);
      return cols;
    } catch (err: any) {
      const message = err?.response?.data?.msg || err?.message || "加载字段失败";
      setError(message);
      console.error("Failed to load columns:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [api]);

  // 自动加载
  useEffect(() => {
    if (autoLoad && tableId) {
      loadColumns(tableId);
    }
  }, [tableId, autoLoad, loadColumns]);

  // 转换为简化的字段信息
  const fields: FieldInfo[] = useMemo(() => {
    let result = columns.map((col) => ({
      id: col.id,
      title: col.title || col.column_name,
      uidt: col.uidt,
      pv: col.pv,
      system: col.system,
      rqd: col.rqd,
    }));

    if (excludeSystem) {
      result = result.filter((f) => !f.system);
    }

    if (excludeComputed) {
      const computedTypes = FIELD_CATEGORIES.computed;
      result = result.filter((f) => !computedTypes.includes(f.uidt as any));
    }

    return result;
  }, [columns, excludeSystem, excludeComputed]);

  // 根据 ID 获取字段
  const getFieldById = useCallback((id: string): FieldInfo | undefined => {
    return fields.find((f) => f.id === id);
  }, [fields]);

  // 获取可编辑字段（排除计算字段和系统字段）
  const getEditableFields = useCallback((): FieldInfo[] => {
    const nonEditableTypes = [...FIELD_CATEGORIES.computed, ...FIELD_CATEGORIES.user];
    return fields.filter((f) => !f.system && !nonEditableTypes.includes(f.uidt as any));
  }, [fields]);

  // 按类型过滤字段
  const getFieldsByType = useCallback((types: string[]): FieldInfo[] => {
    return fields.filter((f) => types.includes(f.uidt));
  }, [fields]);

  return {
    columns,
    fields,
    loading,
    error,
    loadColumns,
    getFieldById,
    getEditableFields,
    getFieldsByType,
  };
}

/**
 * 多表格字段缓存 Hook
 */
export function useMultiTableColumns() {
  const { api } = useApi({ useGlobalInstance: true });
  const [cache, setCache] = useState<Record<string, FieldInfo[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loadedTables, setLoadedTables] = useState<Set<string>>(new Set());

  const loadFieldsForTable = useCallback(async (tableId: string): Promise<FieldInfo[]> => {
    // 已加载过或正在加载中，直接返回缓存
    if (cache[tableId]) return cache[tableId];
    if (loading[tableId] || loadedTables.has(tableId)) return [];

    setLoading((prev) => ({ ...prev, [tableId]: true }));

    try {
      // 使用正确的 API 端点获取表格信息（包含 columns）
      const response = await api.instance.get(`/api/v2/meta/tables/${tableId}`);
      const cols: any[] = response.data?.columns || [];

      const fields: FieldInfo[] = cols
        .filter((col) => !col.system)
        .map((col) => ({
          id: col.id,
          title: col.title || col.column_name,
          uidt: col.uidt,
          pv: col.pv,
          system: col.system,
          rqd: col.rqd,
        }))
        .sort((a, b) => (cols.find(c => c.id === a.id)?.order ?? 999) - (cols.find(c => c.id === b.id)?.order ?? 999));

      setCache((prev) => ({ ...prev, [tableId]: fields }));
      setLoadedTables((prev) => new Set(prev).add(tableId));
      return fields;
    } catch (err) {
      console.error(`Failed to load fields for table ${tableId}:`, err);
      // 标记为已尝试加载，防止重复请求
      setLoadedTables((prev) => new Set(prev).add(tableId));
      return [];
    } finally {
      setLoading((prev) => ({ ...prev, [tableId]: false }));
    }
  }, [api, cache, loading, loadedTables]);

  const getFieldsForTable = useCallback((tableId: string): FieldInfo[] => {
    if (cache[tableId]) return cache[tableId];
    // 未加载过且未在加载中才触发加载
    if (!loadedTables.has(tableId) && !loading[tableId]) {
      loadFieldsForTable(tableId);
    }
    return [];
  }, [cache, loadedTables, loading, loadFieldsForTable]);

  const clearCache = useCallback(() => {
    setCache({});
    setLoadedTables(new Set());
  }, []);

  return {
    cache,
    loading,
    loadFieldsForTable,
    getFieldsForTable,
    clearCache,
  };
}

export default useTableColumns;
