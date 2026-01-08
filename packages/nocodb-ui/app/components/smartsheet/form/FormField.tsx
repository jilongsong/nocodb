"use client";

import { useState, useEffect, useCallback, forwardRef } from "react";
import type { ColumnType } from "nocodb-sdk";
import { UITypes } from "nocodb-sdk";
import {
  GripVertical,
  X,
  Star,
  Calendar as CalendarIcon,
  Link2,
  Mail,
  Phone,
  AlertCircle,
  Plus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { FormColumnType } from "@/app/composables/useFormView";

interface FormFieldProps {
  column: FormColumnType;
  value: any;
  error?: string;
  isActive?: boolean;
  isEditable?: boolean;
  isDragging?: boolean;
  onValueChange?: (value: any) => void;
  onFieldClick?: () => void;
  onRemove?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  function FormField(
    {
      column,
      value,
      error,
      isActive = false,
      isEditable = true,
      isDragging = false,
      onValueChange,
      onFieldClick,
      onRemove,
      dragHandleProps,
    },
    ref
  ) {
    const [localValue, setLocalValue] = useState(value);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const handleChange = useCallback(
      (newValue: any) => {
        setLocalValue(newValue);
        onValueChange?.(newValue);
      },
      [onValueChange]
    );

    const fieldLabel = column.label || column.title || "";
    const isRequired = !!(column.required || (column.rqd && !column.cdf));

    const renderInput = () => {
      const uidt = column.uidt as UITypes;

      // Checkbox
      if (uidt === UITypes.Checkbox) {
        return (
          <div className="flex items-center space-x-3 py-2">
            <Checkbox
              id={`field-${column.id}`}
              checked={!!localValue}
              onCheckedChange={(checked) => handleChange(checked)}
              className="h-5 w-5 data-[state=checked]:bg-primary"
            />
            <label
              htmlFor={`field-${column.id}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
            >
              {localValue ? "是" : "否"}
            </label>
          </div>
        );
      }

      // Rating
      if (uidt === UITypes.Rating) {
        const maxRating = 5;
        const currentRating = Number(localValue) || 0;
        return (
          <div className="flex items-center gap-1 py-2">
            {Array.from({ length: maxRating }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleChange(i + 1 === currentRating ? null : i + 1)}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={cn(
                    "w-7 h-7 transition-all duration-150",
                    i < currentRating
                      ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                      : "text-muted-foreground/30 hover:text-amber-300"
                  )}
                />
              </button>
            ))}
            {currentRating > 0 && (
              <span className="ml-3 text-sm text-muted-foreground">
                {currentRating} / {maxRating}
              </span>
            )}
          </div>
        );
      }

      // Long Text
      if (uidt === UITypes.LongText) {
        return (
          <Textarea
            value={localValue ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`请输入${fieldLabel}...`}
            rows={4}
            className={cn(
              "resize-none transition-all",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
        );
      }

      // Number types
      if (
        uidt === UITypes.Number ||
        uidt === UITypes.Decimal ||
        uidt === UITypes.Currency ||
        uidt === UITypes.Percent ||
        uidt === UITypes.Duration
      ) {
        return (
          <div className="relative">
            <Input
              type="number"
              value={localValue ?? ""}
              onChange={(e) =>
                handleChange(e.target.value ? Number(e.target.value) : null)
              }
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={`请输入${fieldLabel}`}
              step={uidt === UITypes.Decimal ? "0.01" : "1"}
              className={cn(
                "transition-all",
                uidt === UITypes.Currency && "pl-8",
                uidt === UITypes.Percent && "pr-8",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {uidt === UITypes.Currency && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ¥
              </span>
            )}
            {uidt === UITypes.Percent && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            )}
          </div>
        );
      }

      // Date
      if (uidt === UITypes.Date) {
        const dateValue = localValue ? new Date(localValue) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-10",
                  !localValue && "text-muted-foreground",
                  error && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localValue ? (
                  format(dateValue!, "yyyy年MM月dd日", { locale: zhCN })
                ) : (
                  <span>选择日期...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) =>
                  handleChange(date ? format(date, "yyyy-MM-dd") : null)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      }

      // DateTime
      if (uidt === UITypes.DateTime) {
        return (
          <Input
            type="datetime-local"
            value={formatDateTimeForInput(localValue)}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "transition-all",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
        );
      }

      // Time
      if (uidt === UITypes.Time) {
        return (
          <Input
            type="time"
            value={localValue ?? ""}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "transition-all",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
        );
      }

      // Email
      if (uidt === UITypes.Email) {
        return (
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              value={localValue ?? ""}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="example@email.com"
              className={cn(
                "pl-10 transition-all",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
          </div>
        );
      }

      // URL
      if (uidt === UITypes.URL) {
        return (
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="url"
              value={localValue ?? ""}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="https://example.com"
              className={cn(
                "pl-10 transition-all",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
          </div>
        );
      }

      // Phone
      if (uidt === UITypes.PhoneNumber) {
        return (
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="tel"
              value={localValue ?? ""}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="请输入电话号码"
              className={cn(
                "pl-10 transition-all",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
          </div>
        );
      }

      // Single Select
      if (uidt === UITypes.SingleSelect) {
        const options = getSelectOptions(column);
        return (
          <Select
            value={localValue ?? ""}
            onValueChange={(val) => handleChange(val || null)}
          >
            <SelectTrigger
              className={cn(
                "w-full transition-all",
                error && "border-destructive focus:ring-destructive"
              )}
            >
              <SelectValue placeholder="请选择..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    {opt.color && (
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      // Multi Select
      if (uidt === UITypes.MultiSelect) {
        const options = getSelectOptions(column);
        const selectedValues: string[] = Array.isArray(localValue)
          ? localValue
          : localValue
          ? String(localValue).split(",").filter(Boolean)
          : [];

        return (
          <div className="space-y-3">
            <div
              className={cn(
                "min-h-[44px] p-2 rounded-md border bg-background transition-all",
                isFocused && "ring-2 ring-ring",
                error && "border-destructive"
              )}
              onClick={() => setIsFocused(true)}
            >
              {selectedValues.length === 0 ? (
                <span className="text-muted-foreground text-sm px-1">
                  点击下方选项添加...
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedValues.map((val) => {
                    const opt = options.find((o) => o.value === val);
                    return (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="gap-1 pr-1 text-sm font-normal hover:bg-secondary"
                        style={opt?.color ? { backgroundColor: `${opt.color}20`, borderColor: opt.color } : {}}
                      >
                        {opt?.color && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                        )}
                        {val}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChange(selectedValues.filter((v) => v !== val));
                          }}
                          className="ml-1 rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {options
                .filter((opt) => !selectedValues.includes(opt.value))
                .map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange([...selectedValues, opt.value])}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full",
                      "border border-dashed border-muted-foreground/30",
                      "hover:border-primary hover:bg-primary/5 hover:text-primary",
                      "transition-all duration-150 active:scale-95"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {opt.color && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: opt.color }}
                      />
                    )}
                    {opt.label}
                  </button>
                ))}
            </div>
          </div>
        );
      }

      // Default: text input
      return (
        <Input
          type="text"
          value={localValue ?? ""}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`请输入${fieldLabel}...`}
          className={cn(
            "transition-all",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        />
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          "group relative transition-all duration-200",
          // Edit mode: card-like appearance with borders and shadows
          isEditable && [
            "bg-card rounded-xl border shadow-sm",
            isActive && "ring-2 ring-primary shadow-md border-primary/50",
            !isActive && "hover:shadow-md hover:border-muted-foreground/20",
            isDragging && "opacity-60 shadow-lg rotate-1 scale-[1.02] border-border",
            isFocused && !isActive && "border-muted-foreground/30",
          ],
          // Fill mode: clean, minimal appearance
          !isEditable && "bg-transparent"
        )}
        onClick={onFieldClick}
      >
        {/* Drag handle - only in edit mode */}
        {isEditable && dragHandleProps && (
          <div
            {...dragHandleProps}
            className={cn(
              "absolute -left-3 top-6 p-1.5 rounded-lg cursor-grab active:cursor-grabbing",
              "bg-primary text-primary-foreground shadow-md",
              "opacity-0 group-hover:opacity-100 transition-all duration-200",
              "hover:scale-110 active:scale-95 border"
            )}
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Remove button - only in edit mode */}
        {isEditable && isActive && onRemove && !isRequired && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={cn(
              "absolute -right-2 -top-2 p-1.5 rounded-full",
              "bg-muted text-muted-foreground shadow-md",
              "hover:bg-destructive hover:text-destructive-foreground",
              "transition-all duration-150 hover:scale-110 active:scale-95"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Content padding: more in edit mode, less in fill mode */}
        <div className={cn(isEditable ? "p-5 sm:p-6" : "py-3")}>
          {/* Label */}
          <div className="flex items-center gap-2 mb-1.5">
            <Label className="text-sm font-semibold text-foreground">
              {fieldLabel}
              {isRequired && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
          </div>

          {/* Description */}
          {column.description && (
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {column.description}
            </p>
          )}

          {/* Input */}
          <div className="mt-2">{renderInput()}</div>

          {/* Error */}
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

// Helper functions
function formatDateTimeForInput(value: any): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

function getSelectOptions(column: ColumnType): SelectOption[] {
  const colOptions = column.colOptions as any;
  if (!colOptions?.options) return [];
  return colOptions.options.map((opt: any) => ({
    value: opt.title || opt.value || opt,
    label: opt.title || opt.value || opt,
    color: opt.color,
  }));
}

export default FormField;
