"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ColumnType } from "nocodb-sdk";
import { X, Check, ChevronDown } from "lucide-react";

interface SelectOption {
  title: string;
  color?: string;
  order?: number;
}

// Color palette for select options
const OPTION_COLORS = [
  { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-200" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" },
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200" },
  { bg: "bg-lime-100", text: "text-lime-800", border: "border-lime-200" },
  { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-200" },
  { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-200" },
  { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-200" },
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-200" },
  { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-200" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-800", border: "border-fuchsia-200" },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-200" },
  { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" },
  { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-200" },
];

// Get color for option by index
const getOptionColor = (index: number) => {
  return OPTION_COLORS[index % OPTION_COLORS.length];
};

interface SingleSelectCellProps {
  value: string | null;
  column: ColumnType;
  isEditing: boolean;
  readOnly?: boolean;
  onChange: (value: string | null) => void;
  onEditEnd?: () => void;
}

export function SingleSelectCell({
  value,
  column,
  isEditing,
  readOnly = false,
  onChange,
  onEditEnd,
}: SingleSelectCellProps) {
  const [isOpen, setIsOpen] = useState(isEditing);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get options from column
  const options: SelectOption[] = column.colOptions?.options || [];

  // Filter options
  const filteredOptions = options.filter((opt) =>
    opt.title.toLowerCase().includes(search.toLowerCase())
  );

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onEditEnd?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onEditEnd]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle select
  const handleSelect = (optionTitle: string) => {
    onChange(optionTitle);
    setIsOpen(false);
    setSearch("");
    onEditEnd?.();
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Find selected option
  const selectedOption = options.find((opt) => opt.title === value);
  const selectedIndex = options.findIndex((opt) => opt.title === value);
  const selectedColor = selectedIndex >= 0 ? getOptionColor(selectedIndex) : null;

  if (readOnly || !isEditing) {
    // Display mode
    return (
      <div className="h-full flex items-center px-2">
        {selectedOption ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              selectedColor?.bg || "bg-gray-100"
            } ${selectedColor?.text || "text-gray-800"}`}
          >
            {selectedOption.title}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div ref={containerRef} className="relative h-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-full flex items-center px-2 cursor-pointer"
      >
        {selectedOption ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium truncate ${
                selectedColor?.bg || "bg-gray-100"
              } ${selectedColor?.text || "text-gray-800"}`}
            >
              {selectedOption.title}
            </span>
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-200 rounded shrink-0"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">选择...</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-auto" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
          {/* Search */}
          <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500 text-center">
                无匹配选项
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optIndex = options.indexOf(opt);
                const color = getOptionColor(optIndex);
                const isSelected = opt.title === value;
                return (
                  <button
                    key={opt.title}
                    onClick={() => handleSelect(opt.title)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color.bg} ${color.text}`}
                    >
                      {opt.title}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 ml-auto" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MultiSelectCellProps {
  value: string[] | string | null;
  column: ColumnType;
  isEditing: boolean;
  readOnly?: boolean;
  onChange: (value: string[]) => void;
  onEditEnd?: () => void;
}

export function MultiSelectCell({
  value,
  column,
  isEditing,
  readOnly = false,
  onChange,
  onEditEnd,
}: MultiSelectCellProps) {
  const [isOpen, setIsOpen] = useState(isEditing);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse value to array
  const selectedValues: string[] = Array.isArray(value)
    ? value
    : value
    ? String(value).split(",").filter(Boolean)
    : [];

  // Get options from column
  const options: SelectOption[] = column.colOptions?.options || [];

  // Filter options
  const filteredOptions = options.filter((opt) =>
    opt.title.toLowerCase().includes(search.toLowerCase())
  );

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onEditEnd?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onEditEnd]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle toggle option
  const handleToggle = (optionTitle: string) => {
    if (selectedValues.includes(optionTitle)) {
      onChange(selectedValues.filter((v) => v !== optionTitle));
    } else {
      onChange([...selectedValues, optionTitle]);
    }
  };

  // Handle remove
  const handleRemove = (optionTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== optionTitle));
  };

  if (readOnly || !isEditing) {
    // Display mode
    return (
      <div className="h-full flex items-center px-2 gap-1 overflow-hidden">
        {selectedValues.length === 0 ? (
          <span className="text-gray-300">-</span>
        ) : (
          <>
            {selectedValues.slice(0, 3).map((val) => {
              const optIndex = options.findIndex((o) => o.title === val);
              const color = optIndex >= 0 ? getOptionColor(optIndex) : null;
              return (
                <span
                  key={val}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium truncate ${
                    color?.bg || "bg-gray-100"
                  } ${color?.text || "text-gray-800"}`}
                >
                  {val}
                </span>
              );
            })}
            {selectedValues.length > 3 && (
              <span className="text-xs text-gray-500">
                +{selectedValues.length - 3}
              </span>
            )}
          </>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div ref={containerRef} className="relative h-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="h-full flex items-center px-2 cursor-pointer gap-1 flex-wrap"
      >
        {selectedValues.length === 0 ? (
          <span className="text-gray-400 text-sm">选择...</span>
        ) : (
          <>
            {selectedValues.slice(0, 2).map((val) => {
              const optIndex = options.findIndex((o) => o.title === val);
              const color = optIndex >= 0 ? getOptionColor(optIndex) : null;
              return (
                <span
                  key={val}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    color?.bg || "bg-gray-100"
                  } ${color?.text || "text-gray-800"}`}
                >
                  {val}
                  <button
                    onClick={(e) => handleRemove(val, e)}
                    className="hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedValues.length > 2 && (
              <span className="text-xs text-gray-500">
                +{selectedValues.length - 2}
              </span>
            )}
          </>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-auto" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
          {/* Search */}
          <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索..."
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options */}
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500 text-center">
                无匹配选项
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const optIndex = options.indexOf(opt);
                const color = getOptionColor(optIndex);
                const isSelected = selectedValues.includes(opt.title);
                return (
                  <button
                    key={opt.title}
                    onClick={() => handleToggle(opt.title)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color.bg} ${color.text}`}
                    >
                      {opt.title}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
