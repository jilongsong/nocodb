"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Table2,
  Search,
  ChevronDown,
  Check,
  Loader2,
  RefreshCw,
  Database,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import {
  useAvailableTables,
  useTableColumns,
  useTableRecords,
} from "@/app/composables/useAutomation/useAutomationRecipients";

// ==================== 类型定义 ====================

export interface TableInfo {
  id: string;
  title: string;
  type?: string;
}

export interface ColumnInfo {
  id: string;
  title: string;
  uidt: string;
  meta?: Record<string, any>;
}

export interface RecordItem {
  id: string | number;
  displayValue: string;
  rawValue: any;
  record: Record<string, any>;
}

export interface TableRecordPickerProps {
  baseId: string;
  value: RecordItem[];
  onChange: (records: RecordItem[]) => void;
  multiple?: boolean;
  placeholder?: string;
  maxSelections?: number;
  className?: string;
  // 可选：允许外部传入表格列表
  tables?: TableInfo[];
  // 可选：字段过滤器
  columnFilter?: (column: ColumnInfo) => boolean;
}

// ==================== 子组件：选择器下拉框 ====================

interface SelectDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  placeholder: string;
  loading?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  emptyText?: string;
}

function SelectDropdown({
  value,
  onChange,
  options,
  placeholder,
  loading,
  disabled,
  searchable = false,
  emptyText = "无可选项",
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const query = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, search]);

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 h-9 px-3
          bg-white border border-gray-200 rounded-lg text-sm
          transition-all duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-300 hover:shadow-sm"}
          ${isOpen ? "border-blue-500 ring-2 ring-blue-100 shadow-sm" : ""}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : selectedOption?.icon ? (
            selectedOption.icon
          ) : (
            <Database className="w-4 h-4 text-gray-400" />
          )}
          <span className={`truncate ${selectedOption ? "text-gray-900" : "text-gray-400"}`}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索..."
                    className="pl-8 h-8 text-sm"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="max-h-56 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-gray-400">
                  {emptyText}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left
                      transition-colors duration-150
                      ${value === option.value ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"}
                    `}
                  >
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="flex-1 truncate">{option.label}</span>
                    {value === option.value && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== 子组件：记录列表 ====================

interface RecordListProps {
  records: RecordItem[];
  selectedIds: Set<string | number>;
  onToggle: (record: RecordItem) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  loading?: boolean;
  multiple?: boolean;
}

function RecordList({
  records,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  loading,
  multiple = true,
}: RecordListProps) {
  const allSelected = records.length > 0 && records.every((r) => selectedIds.has(r.id));
  const someSelected = records.some((r) => selectedIds.has(r.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">加载记录中...</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="py-8 text-center">
        <Database className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">没有找到记录</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 批量操作栏 */}
      {multiple && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={allSelected ? onClearAll : onSelectAll}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-500" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {allSelected ? "取消全选" : "全选"}
            </button>
          </div>
          <span className="text-xs text-gray-400">
            已选 {selectedIds.size} / {records.length}
          </span>
        </div>
      )}

      {/* 记录列表 */}
      <div className="max-h-64 overflow-auto divide-y divide-gray-100">
        {records.map((record, idx) => {
          const isSelected = selectedIds.has(record.id);
          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onToggle(record)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left
                transition-colors duration-150
                ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}
              `}
            >
              {multiple ? (
                isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-gray-300 shrink-0" />
                )
              ) : (
                <div
                  className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
                    ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"}
                  `}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{record.displayValue}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">#{idx + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 主组件：TableRecordPicker ====================

export function TableRecordPicker({
  baseId,
  value,
  onChange,
  multiple = true,
  placeholder = "从表格中选择数据...",
  maxSelections,
  className = "",
  tables: externalTables,
  columnFilter,
}: TableRecordPickerProps) {
  // 状态
  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");

  // API Hooks
  const { tables: apiTables, loading: tablesLoading } = useAvailableTables({
    baseId,
    enabled: !!baseId && !externalTables,
  });

  const { columns, loading: columnsLoading } = useTableColumns({
    tableId: selectedTableId,
    enabled: !!selectedTableId,
  });

  const { records: rawRecords, loading: recordsLoading, refetch } = useTableRecords({
    baseId,
    tableId: selectedTableId,
    fields: selectedColumnId ? [selectedColumnId] : undefined,
    enabled: !!baseId && !!selectedTableId && !!selectedColumnId,
  });

  // 合并表格数据
  const tables = externalTables || apiTables;

  // 过滤字段
  const filteredColumns = useMemo(() => {
    if (columnFilter) {
      return columns.filter(columnFilter);
    }
    return columns;
  }, [columns, columnFilter]);

  // 转换记录为统一格式
  const records: RecordItem[] = useMemo(() => {
    if (!selectedColumnId || !rawRecords.length) return [];

    const column = columns.find((c) => c.id === selectedColumnId);
    if (!column) return [];

    return rawRecords
      .map((record, idx) => {
        const fieldValue = record[column.title];
        if (!fieldValue) return null;

        // 处理不同类型的值
        let displayValue: string;
        if (Array.isArray(fieldValue)) {
          displayValue = fieldValue
            .map((v) => (typeof v === "object" ? v.email || v.value || JSON.stringify(v) : v))
            .join(", ");
        } else if (typeof fieldValue === "object") {
          displayValue = fieldValue.email || fieldValue.value || JSON.stringify(fieldValue);
        } else {
          displayValue = String(fieldValue);
        }

        return {
          id: record.Id || record.id || idx,
          displayValue,
          rawValue: fieldValue,
          record,
        };
      })
      .filter(Boolean) as RecordItem[];
  }, [rawRecords, columns, selectedColumnId]);

  // 已选择的 ID 集合
  const selectedIds = useMemo(() => {
    return new Set(value.map((v) => v.id));
  }, [value]);

  // 切换选择
  const handleToggle = useCallback(
    (record: RecordItem) => {
      const isSelected = selectedIds.has(record.id);

      if (isSelected) {
        onChange(value.filter((v) => v.id !== record.id));
      } else {
        if (!multiple) {
          onChange([record]);
        } else if (maxSelections && value.length >= maxSelections) {
          return;
        } else {
          onChange([...value, record]);
        }
      }
    },
    [value, onChange, selectedIds, multiple, maxSelections]
  );

  // 全选
  const handleSelectAll = useCallback(() => {
    const newRecords = records.filter((r) => !selectedIds.has(r.id));
    if (maxSelections) {
      const remaining = maxSelections - value.length;
      onChange([...value, ...newRecords.slice(0, remaining)]);
    } else {
      onChange([...value, ...newRecords]);
    }
  }, [records, selectedIds, value, onChange, maxSelections]);

  // 取消全选
  const handleClearAll = useCallback(() => {
    const recordIds = new Set(records.map((r) => r.id));
    onChange(value.filter((v) => !recordIds.has(v.id)));
  }, [records, value, onChange]);

  // 移除已选项
  const handleRemove = useCallback(
    (id: string | number) => {
      onChange(value.filter((v) => v.id !== id));
    },
    [value, onChange]
  );

  // 表格选项
  const tableOptions = useMemo(
    () =>
      tables.map((t) => ({
        value: t.id,
        label: t.title,
        icon: <Table2 className="w-4 h-4 text-gray-400" />,
      })),
    [tables]
  );

  // 字段选项
  const columnOptions = useMemo(
    () =>
      filteredColumns.map((c) => ({
        value: c.id,
        label: `${c.title} (${c.uidt})`,
        icon: <Database className="w-4 h-4 text-gray-400" />,
      })),
    [filteredColumns]
  );

  // 重置字段选择当表格变化
  useEffect(() => {
    setSelectedColumnId("");
  }, [selectedTableId]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 已选择的项目 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm"
            >
              <span className="max-w-[150px] truncate">{item.displayValue}</span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="p-0.5 hover:bg-blue-100 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 步骤1：选择表格 */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
            1
          </span>
          选择表格
        </label>
        <SelectDropdown
          value={selectedTableId}
          onChange={setSelectedTableId}
          options={tableOptions}
          placeholder="选择一个表格..."
          loading={tablesLoading}
          searchable={tableOptions.length > 5}
          emptyText="没有可用的表格"
        />
      </div>

      {/* 步骤2：选择字段 */}
      {selectedTableId && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
              2
            </span>
            选择字段
          </label>
          <SelectDropdown
            value={selectedColumnId}
            onChange={setSelectedColumnId}
            options={columnOptions}
            placeholder="选择一个字段..."
            loading={columnsLoading}
            searchable={columnOptions.length > 5}
            emptyText="没有可用的字段"
          />
        </div>
      )}

      {/* 步骤3：选择记录 */}
      {selectedTableId && selectedColumnId && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
                3
              </span>
              选择记录
            </label>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={recordsLoading}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recordsLoading ? "animate-spin" : ""}`} />
              刷新
            </button>
          </div>
          <RecordList
            records={records}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            loading={recordsLoading}
            multiple={multiple}
          />
        </div>
      )}

      {/* 空状态提示 */}
      {!selectedTableId && (
        <div className="py-6 text-center border border-dashed border-gray-200 rounded-lg">
          <Table2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">{placeholder}</p>
        </div>
      )}
    </div>
  );
}

export default TableRecordPicker;
