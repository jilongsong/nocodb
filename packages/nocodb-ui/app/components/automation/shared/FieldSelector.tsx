"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Type,
  Hash,
  Calendar,
  Mail,
  Link,
  CheckSquare,
  List,
  Phone,
  Percent,
  DollarSign,
  Clock,
  MapPin,
  File,
  Users,
  ArrowRight,
  Calculator,
  Eye,
  X,
  Loader2,
} from "lucide-react";
import { useTableColumns, type FieldInfo, FIELD_TYPE_LABELS } from "@/app/composables/useTableColumns";

// 重新导出 FieldInfo 类型
export type { FieldInfo };

// 字段类型图标映射
const fieldTypeIcons: Record<string, React.ElementType> = {
  SingleLineText: Type,
  LongText: Type,
  Number: Hash,
  Decimal: Hash,
  Currency: DollarSign,
  Percent: Percent,
  Date: Calendar,
  DateTime: Clock,
  Time: Clock,
  Email: Mail,
  URL: Link,
  PhoneNumber: Phone,
  Checkbox: CheckSquare,
  SingleSelect: List,
  MultiSelect: List,
  Attachment: File,
  User: Users,
  CreatedBy: Users,
  LastModifiedBy: Users,
  LinkToAnotherRecord: ArrowRight,
  Links: ArrowRight,
  Lookup: Eye,
  Rollup: Calculator,
  Formula: Calculator,
  Rating: Hash,
  Duration: Clock,
  GeoData: MapPin,
  Barcode: Hash,
  QrCode: Hash,
};

// 使用从 useTableColumns 导入的 FIELD_TYPE_LABELS

interface FieldSelectorProps {
  fields: FieldInfo[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  label?: string;
  excludeTypes?: string[];
  includeTypes?: string[];
  showSystemFields?: boolean;
  disabled?: boolean;
  compact?: boolean;  // 紧凑模式，不显示下拉
  inline?: boolean;   // 内联模式，直接显示字段列表
}

export function FieldSelector({
  fields,
  value,
  onChange,
  multiple = false,
  placeholder = "选择字段",
  label,
  excludeTypes = [],
  includeTypes = [],
  showSystemFields = false,
  disabled = false,
  compact = false,
  inline = false,
}: FieldSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 过滤字段
  const filteredFields = useMemo(() => {
    let result = fields;
    if (!showSystemFields) {
      result = result.filter((f) => !f.system);
    }
    if (includeTypes.length > 0) {
      result = result.filter((f) => includeTypes.includes(f.uidt));
    }
    if (excludeTypes.length > 0) {
      result = result.filter((f) => !excludeTypes.includes(f.uidt));
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((f) => f.title.toLowerCase().includes(query));
    }
    return result;
  }, [fields, searchQuery, excludeTypes, includeTypes, showSystemFields]);

  // 已选择的字段
  const selectedFields = useMemo(() => {
    if (!value) return [];
    const ids = Array.isArray(value) ? value : [value];
    return fields.filter((f) => ids.includes(f.id));
  }, [fields, value]);

  // 选择字段
  const handleSelect = (fieldId: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : value ? [value] : [];
      const newValues = currentValues.includes(fieldId)
        ? currentValues.filter((id) => id !== fieldId)
        : [...currentValues, fieldId];
      onChange(newValues);
    } else {
      onChange(fieldId);
      setIsOpen(false);
    }
  };

  // 移除已选字段
  const handleRemove = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      onChange(currentValues.filter((id) => id !== fieldId));
    } else {
      onChange("");
    }
  };

  // 内联模式 - 直接显示字段列表供选择
  if (inline) {
    return (
      <div>
        {label && <label className="block text-sm text-gray-600 mb-2">{label}</label>}
        {fields.length > 8 && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-gray-300"
            />
          </div>
        )}
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-auto">
          {filteredFields.length === 0 ? (
            <div className="p-3 text-sm text-gray-400 text-center">暂无字段</div>
          ) : (
            filteredFields.map((field) => {
              const isSelected = multiple
                ? (Array.isArray(value) ? value : []).includes(field.id)
                : value === field.id;
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => !disabled && handleSelect(field.id)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""} ${disabled ? "opacity-50" : ""}`}
                >
                  {multiple && (
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300"}`}>
                      {isSelected && "✓"}
                    </span>
                  )}
                  <FieldIcon type={field.uidt} className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 truncate">{field.title}</span>
                  <span className="text-xs text-gray-400">{FIELD_TYPE_LABELS[field.uidt] || field.uidt}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 紧凑模式或普通下拉模式
  return (
    <div className="relative">
      {label && <label className="block text-sm text-gray-600 mb-1">{label}</label>}

      {/* 已选择的字段标签 (多选时) */}
      {multiple && selectedFields.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedFields.map((field) => (
            <span
              key={field.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-sm"
            >
              <FieldIcon type={field.uidt} className="w-3 h-3 text-gray-400" />
              {field.title}
              <button type="button" onClick={(e) => handleRemove(field.id, e)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded text-sm text-left ${disabled ? "bg-gray-50 text-gray-400" : "bg-white hover:border-gray-300"} ${isOpen ? "border-blue-400" : "border-gray-200"}`}
      >
        {!multiple && selectedFields.length === 1 ? (
          <>
            <FieldIcon type={selectedFields[0].uidt} className="w-4 h-4 text-gray-400" />
            <span className="flex-1 truncate">{selectedFields[0].title}</span>
          </>
        ) : (
          <span className="flex-1 text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* 下拉列表 */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
            {fields.length > 6 && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索字段..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border-0 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="max-h-56 overflow-auto">
              {filteredFields.length === 0 ? (
                <div className="p-3 text-sm text-gray-400 text-center">无匹配字段</div>
              ) : (
                filteredFields.map((field) => {
                  const isSelected = multiple
                    ? (Array.isArray(value) ? value : []).includes(field.id)
                    : value === field.id;
                  return (
                    <button
                      key={field.id}
                      type="button"
                      onClick={() => handleSelect(field.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      {multiple && (
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300"}`}>
                          {isSelected && "✓"}
                        </span>
                      )}
                      <FieldIcon type={field.uidt} className="w-4 h-4 text-gray-400" />
                      <span className="flex-1 truncate">{field.title}</span>
                      <span className="text-xs text-gray-400">{FIELD_TYPE_LABELS[field.uidt]}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 字段图标组件
function FieldIcon({ type, className }: { type: string; className?: string }) {
  const Icon = fieldTypeIcons[type] || Type;
  return <Icon className={className} />;
}

export default FieldSelector;
