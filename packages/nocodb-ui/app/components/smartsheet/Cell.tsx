"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ColumnType } from "nocodb-sdk";
import { UITypes } from "nocodb-sdk";
import { Check, X, Calendar, Link, Mail, Phone, Star } from "lucide-react";
import { SingleSelectCell, MultiSelectCell } from "./cells/SelectCell";

interface CellProps {
  value: any;
  column: ColumnType;
  isEditing?: boolean;
  isActive?: boolean;
  readOnly?: boolean;
  onChange?: (value: any) => void;
  onEditEnd?: () => void;
}

export function Cell({
  value,
  column,
  isEditing = false,
  isActive = false,
  readOnly = false,
  onChange,
  onEditEnd,
}: CellProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Handle value change
  const handleChange = useCallback(
    (newValue: any) => {
      setLocalValue(newValue);
    },
    []
  );

  // Handle blur (save value)
  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange?.(localValue);
    }
    onEditEnd?.();
  }, [localValue, value, onChange, onEditEnd]);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLocalValue(value); // Revert
        onEditEnd?.();
      }
    },
    [handleBlur, value, onEditEnd]
  );

  // Render based on column type
  const uidt = column.uidt as UITypes;

  // Checkbox
  if (uidt === UITypes.Checkbox) {
    return (
      <div className="h-full flex items-center justify-center">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => !readOnly && onChange?.(e.target.checked)}
          disabled={readOnly}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>
    );
  }

  // Rating
  if (uidt === UITypes.Rating) {
    const maxRating = 5;
    const currentRating = Number(value) || 0;
    return (
      <div className="h-full flex items-center px-2 gap-0.5">
        {Array.from({ length: maxRating }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 cursor-pointer ${
              i < currentRating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
            onClick={() => !readOnly && onChange?.(i + 1)}
          />
        ))}
      </div>
    );
  }

  // Number types (editing mode)
  if (
    isEditing &&
    (uidt === UITypes.Number ||
      uidt === UITypes.Decimal ||
      uidt === UITypes.Currency ||
      uidt === UITypes.Percent ||
      uidt === UITypes.Duration)
  ) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        value={localValue ?? ""}
        onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : null)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2 text-sm border-none outline-none bg-white"
        step={uidt === UITypes.Decimal ? "0.01" : "1"}
      />
    );
  }

  // Long text (editing mode)
  if (isEditing && uidt === UITypes.LongText) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={localValue ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setLocalValue(value);
            onEditEnd?.();
          }
        }}
        className="w-full h-full px-2 py-1 text-sm border-none outline-none bg-white resize-none"
        rows={3}
      />
    );
  }

  // Date (editing mode)
  if (isEditing && (uidt === UITypes.Date || uidt === UITypes.DateTime)) {
    const inputType = uidt === UITypes.DateTime ? "datetime-local" : "date";
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        value={formatDateForInput(localValue, uidt)}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2 text-sm border-none outline-none bg-white"
      />
    );
  }

  // Time (editing mode)
  if (isEditing && uidt === UITypes.Time) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="time"
        value={localValue ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2 text-sm border-none outline-none bg-white"
      />
    );
  }

  // Single Select
  if (uidt === UITypes.SingleSelect) {
    return (
      <SingleSelectCell
        value={value}
        column={column}
        isEditing={isEditing}
        readOnly={readOnly}
        onChange={(val) => onChange?.(val)}
        onEditEnd={onEditEnd}
      />
    );
  }

  // Multi Select
  if (uidt === UITypes.MultiSelect) {
    return (
      <MultiSelectCell
        value={value}
        column={column}
        isEditing={isEditing}
        readOnly={readOnly}
        onChange={(val) => onChange?.(val)}
        onEditEnd={onEditEnd}
      />
    );
  }

  // Default text editing
  if (isEditing) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={localValue ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2 text-sm border-none outline-none bg-white"
      />
    );
  }

  // Display mode - format value based on type
  return (
    <div className="h-full flex items-center px-2 overflow-hidden">
      <CellDisplay value={value} column={column} />
    </div>
  );
}

// Cell display component for read-only rendering
function CellDisplay({
  value,
  column,
}: {
  value: any;
  column: ColumnType;
}) {
  const uidt = column.uidt as UITypes;

  // Null/undefined
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-300">-</span>;
  }

  // Boolean/Checkbox
  if (uidt === UITypes.Checkbox) {
    return value ? (
      <Check className="w-4 h-4 text-green-500" />
    ) : (
      <X className="w-4 h-4 text-gray-300" />
    );
  }

  // Number types
  if (
    uidt === UITypes.Number ||
    uidt === UITypes.Decimal ||
    uidt === UITypes.AutoNumber
  ) {
    return <span className="text-sm text-gray-700 truncate">{formatNumber(value)}</span>;
  }

  // Currency
  if (uidt === UITypes.Currency) {
    return <span className="text-sm text-gray-700 truncate">{formatCurrency(value)}</span>;
  }

  // Percent
  if (uidt === UITypes.Percent) {
    return <span className="text-sm text-gray-700 truncate">{formatPercent(value)}</span>;
  }

  // Date
  if (uidt === UITypes.Date) {
    return <span className="text-sm text-gray-700 truncate">{formatDate(value)}</span>;
  }

  // DateTime
  if (uidt === UITypes.DateTime || uidt === UITypes.CreatedTime || uidt === UITypes.LastModifiedTime) {
    return <span className="text-sm text-gray-700 truncate">{formatDateTime(value)}</span>;
  }

  // Time
  if (uidt === UITypes.Time) {
    return <span className="text-sm text-gray-700 truncate">{value}</span>;
  }

  // Email
  if (uidt === UITypes.Email) {
    return (
      <a
        href={`mailto:${value}`}
        className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Mail className="w-3 h-3 shrink-0" />
        {value}
      </a>
    );
  }

  // URL
  if (uidt === UITypes.URL) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Link className="w-3 h-3 shrink-0" />
        {value}
      </a>
    );
  }

  // Phone
  if (uidt === UITypes.PhoneNumber) {
    return (
      <a
        href={`tel:${value}`}
        className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Phone className="w-3 h-3 shrink-0" />
        {value}
      </a>
    );
  }

  // Single Select
  if (uidt === UITypes.SingleSelect) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 truncate">
        {value}
      </span>
    );
  }

  // Multi Select
  if (uidt === UITypes.MultiSelect) {
    const values = Array.isArray(value) ? value : String(value).split(",");
    return (
      <div className="flex items-center gap-1 overflow-hidden">
        {values.slice(0, 3).map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 truncate"
          >
            {v}
          </span>
        ))}
        {values.length > 3 && (
          <span className="text-xs text-gray-500">+{values.length - 3}</span>
        )}
      </div>
    );
  }

  // User
  if (uidt === UITypes.User || uidt === UITypes.CreatedBy || uidt === UITypes.LastModifiedBy) {
    const displayValue = typeof value === "object" ? value?.display_name || value?.email : value;
    return (
      <div className="flex items-center gap-2 truncate">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600 shrink-0">
          {displayValue?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <span className="text-sm text-gray-700 truncate">{displayValue}</span>
      </div>
    );
  }

  // Attachment
  if (uidt === UITypes.Attachment) {
    const attachments = Array.isArray(value) ? value : [];
    if (attachments.length === 0) return <span className="text-gray-300">-</span>;
    return (
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-700">{attachments.length} 个附件</span>
      </div>
    );
  }

  // Link to another record
  if (uidt === UITypes.LinkToAnotherRecord || uidt === UITypes.Links) {
    if (Array.isArray(value)) {
      return (
        <span className="text-sm text-blue-600">
          {value.length} 条关联
        </span>
      );
    }
    return <span className="text-sm text-gray-700 truncate">{String(value)}</span>;
  }

  // Default: text
  return <span className="text-sm text-gray-700 truncate">{String(value)}</span>;
}

// Format helpers
function formatNumber(value: any): string {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString("zh-CN");
}

function formatCurrency(value: any): string {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString("zh-CN", { style: "currency", currency: "CNY" });
}

function formatPercent(value: any): string {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `${num}%`;
}

function formatDate(value: any): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toLocaleDateString("zh-CN");
  } catch {
    return String(value);
  }
}

function formatDateTime(value: any): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toLocaleString("zh-CN");
  } catch {
    return String(value);
  }
}

function formatDateForInput(value: any, uidt: UITypes): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (uidt === UITypes.DateTime) {
      return date.toISOString().slice(0, 16);
    }
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}
