"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, Table2 } from "lucide-react";
import { Input } from "@/app/components/ui/Input";

export interface TableInfo {
  id: string;
  title: string;
  table_name?: string;
}

interface TableSelectorProps {
  tables: TableInfo[];
  value?: string;
  onChange: (tableId: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  currentTableId?: string;  // 当前表格ID（高亮显示）
}

export function TableSelector({
  tables,
  value,
  onChange,
  placeholder = "选择表格",
  label,
  disabled = false,
  currentTableId,
}: TableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 过滤表格
  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables;
    const query = searchQuery.toLowerCase();
    return tables.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.table_name?.toLowerCase().includes(query)
    );
  }, [tables, searchQuery]);

  // 已选择的表格
  const selectedTable = useMemo(() => {
    return tables.find((t) => t.id === value);
  }, [tables, value]);

  // 选择表格
  const handleSelect = (tableId: string) => {
    onChange(tableId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 
          border rounded-lg text-left text-sm
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-gray-300"}
          ${isOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}
        `}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Table2 className="w-4 h-4 text-gray-400 shrink-0" />
          <span className={!selectedTable ? "text-gray-400" : "text-gray-900 truncate"}>
            {selectedTable?.title || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索表格..."
                  className="pl-8 text-sm h-8"
                  autoFocus
                />
              </div>
            </div>

            {/* Table List */}
            <div className="max-h-64 overflow-auto">
              {filteredTables.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  未找到匹配的表格
                </div>
              ) : (
                filteredTables.map((table) => {
                  const isSelected = value === table.id;
                  const isCurrent = currentTableId === table.id;

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => handleSelect(table.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50
                        ${isSelected ? "bg-blue-50" : ""}
                      `}
                    >
                      <Table2 className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-900 truncate block">
                          {table.title}
                        </span>
                        {table.table_name && table.table_name !== table.title && (
                          <span className="text-xs text-gray-400">{table.table_name}</span>
                        )}
                      </div>
                      {isCurrent && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          当前表
                        </span>
                      )}
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

export default TableSelector;
