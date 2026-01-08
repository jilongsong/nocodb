"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ColumnType } from "nocodb-sdk";
import { UITypes } from "nocodb-sdk";
import {
  Search,
  X,
  ChevronDown,
  Type,
  Hash,
  Calendar,
  CheckSquare,
  Link,
  Mail,
  Phone,
  Image,
  Star,
  List,
  User,
  Clock,
  Percent,
  DollarSign,
  AlignLeft,
} from "lucide-react";

// Get icon for column type
const getColumnIcon = (uidt: UITypes | string | undefined) => {
  switch (uidt) {
    case UITypes.SingleLineText:
      return Type;
    case UITypes.LongText:
      return AlignLeft;
    case UITypes.Number:
    case UITypes.Decimal:
    case UITypes.AutoNumber:
      return Hash;
    case UITypes.Checkbox:
      return CheckSquare;
    case UITypes.Date:
    case UITypes.DateTime:
      return Calendar;
    case UITypes.Time:
    case UITypes.CreatedTime:
    case UITypes.LastModifiedTime:
      return Clock;
    case UITypes.Email:
      return Mail;
    case UITypes.URL:
      return Link;
    case UITypes.PhoneNumber:
      return Phone;
    case UITypes.Currency:
      return DollarSign;
    case UITypes.Percent:
      return Percent;
    case UITypes.SingleSelect:
    case UITypes.MultiSelect:
      return List;
    case UITypes.Attachment:
      return Image;
    case UITypes.Rating:
      return Star;
    case UITypes.User:
    case UITypes.CreatedBy:
    case UITypes.LastModifiedBy:
      return User;
    case UITypes.LinkToAnotherRecord:
    case UITypes.Links:
      return Link;
    default:
      return Type;
  }
};

// Check if column is searchable
const isSearchableColumn = (column: ColumnType): boolean => {
  if (column.system) return false;
  if (column.title?.startsWith("nc_")) return false;
  
  const searchableTypes = [
    UITypes.SingleLineText,
    UITypes.LongText,
    UITypes.Email,
    UITypes.URL,
    UITypes.PhoneNumber,
    UITypes.Number,
    UITypes.Decimal,
    UITypes.SingleSelect,
    UITypes.MultiSelect,
  ];
  
  return searchableTypes.includes(column.uidt as UITypes);
};

interface SearchDataProps {
  columns: ColumnType[];
  searchQuery: string;
  searchField: string | null;
  onSearchChange: (query: string, field: string | null) => void;
}

export function SearchData({
  columns,
  searchQuery,
  searchField,
  onSearchChange,
}: SearchDataProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [fieldFilter, setFieldFilter] = useState("");
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter searchable columns
  const searchableColumns = columns.filter(isSearchableColumn);

  // Get selected column
  const selectedColumn = searchField
    ? searchableColumns.find((c) => c.id === searchField)
    : searchableColumns.find((c) => c.pv) || searchableColumns[0];

  // Filter columns by search
  const filteredColumns = fieldFilter
    ? searchableColumns.filter((col) =>
        col.title?.toLowerCase().includes(fieldFilter.toLowerCase())
      )
    : searchableColumns;

  // Open field menu
  const openFieldMenu = useCallback(() => {
    if (fieldButtonRef.current) {
      const rect = fieldButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setShowFieldMenu(true);
    setFieldFilter("");
  }, []);

  // Close field menu
  const closeFieldMenu = useCallback(() => {
    setShowFieldMenu(false);
    setFieldFilter("");
  }, []);

  // Handle field selection
  const selectField = useCallback(
    (column: ColumnType) => {
      onSearchChange(searchQuery, column.id!);
      closeFieldMenu();
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [searchQuery, onSearchChange, closeFieldMenu]
  );

  // Handle search input change
  const updateSearchQuery = useCallback(
    (value: string) => {
      onSearchChange(value, searchField || selectedColumn?.id || null);
    },
    [searchField, selectedColumn, onSearchChange]
  );

  // Expand search
  const expandSearch = useCallback(() => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Collapse search
  const collapseSearch = useCallback(() => {
    onSearchChange("", searchField);
    setIsExpanded(false);
    closeFieldMenu();
  }, [searchField, onSearchChange, closeFieldMenu]);

  // Close menu on click outside
  useEffect(() => {
    if (!showFieldMenu) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        fieldButtonRef.current &&
        !fieldButtonRef.current.contains(target)
      ) {
        closeFieldMenu();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFieldMenu, closeFieldMenu]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        expandSearch();
      }
      if (e.key === "Escape") {
        if (showFieldMenu) {
          closeFieldMenu();
        } else if (isExpanded) {
          collapseSearch();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, showFieldMenu, expandSearch, collapseSearch, closeFieldMenu]);

  const SelectedIcon = selectedColumn
    ? getColumnIcon(selectedColumn.uidt as UITypes)
    : Search;

  // Collapsed state - just show search icon
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={expandSearch}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="搜索 (Ctrl+F)"
      >
        <Search className="w-4 h-4 text-gray-500" />
      </button>
    );
  }

  // Field dropdown menu (rendered via Portal)
  const fieldMenu = showFieldMenu && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] w-56 overflow-hidden"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {/* Filter input */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              placeholder="筛选字段..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Field list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredColumns.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                无匹配字段
              </div>
            ) : (
              filteredColumns.map((column) => {
                const Icon = getColumnIcon(column.uidt as UITypes);
                const isActive = column.id === (searchField || selectedColumn?.id);
                return (
                  <div
                    key={column.id}
                    onClick={() => selectField(column)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                      isActive ? "bg-blue-50 text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{column.title}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className="flex items-center gap-1 h-8 px-1 border border-gray-300 rounded-lg bg-white">
        {/* Field selector button */}
        <button
          ref={fieldButtonRef}
          type="button"
          onClick={openFieldMenu}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-medium">
            <SelectedIcon className="w-3 h-3" />
            <span className="max-w-16 truncate">
              {selectedColumn?.title || "字段"}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showFieldMenu ? "rotate-180" : ""}`} />
          </span>
        </button>

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => updateSearchQuery(e.target.value)}
          placeholder={`搜索 ${selectedColumn?.title || ""}...`}
          className="flex-1 h-full px-2 text-sm bg-transparent focus:outline-none min-w-32"
        />

        {/* Clear query button */}
        {searchQuery && (
          <button
            type="button"
            onClick={() => updateSearchQuery("")}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}

        {/* Close search button */}
        <button
          type="button"
          onClick={collapseSearch}
          className="p-1 hover:bg-gray-100 rounded"
          title="关闭搜索"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {fieldMenu}
    </>
  );
}
