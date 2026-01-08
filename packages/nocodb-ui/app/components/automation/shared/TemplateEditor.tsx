"use client";

import { useState, useRef, useCallback } from "react";
import { Variable, X } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { VariablePicker } from "./VariablePicker";
import type { TemplateVariable } from "@/app/composables/useAutomation/types";

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  fields?: FieldInfo[];
  actionResults?: ActionResultInfo[];
  tableId?: string;
  label?: string;
  hint?: string;
}

interface FieldInfo {
  id: string;
  title: string;
  type: string;
}

interface ActionResultInfo {
  id: string;
  label: string;
  type: string;
}

export function TemplateEditor({
  value,
  onChange,
  placeholder = "输入内容，使用 {variable} 插入变量",
  rows = 4,
  fields = [],
  actionResults = [],
  tableId,
  label,
  hint,
}: TemplateEditorProps) {
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // 插入变量到光标位置
  const handleInsertVariable = useCallback(
    (variable: TemplateVariable) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const variableText = `{${variable.name}}`;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue =
        value.substring(0, start) + variableText + value.substring(end);

      onChange(newValue);

      // 设置光标位置到插入的变量后面
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + variableText.length,
          start + variableText.length
        );
      }, 0);

      setShowVariablePicker(false);
    },
    [value, onChange]
  );

  // 解析模板中的变量
  const parseVariables = (template: string): string[] => {
    const matches = template.match(/\{([^}]+)\}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
  };

  const usedVariables = parseVariables(value);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className="relative">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
        />

        {/* Variable Button */}
        <div className="absolute top-2 right-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowVariablePicker(!showVariablePicker)}
            className={showVariablePicker ? "text-blue-600" : "text-gray-400"}
          >
            <Variable className="w-4 h-4" />
          </Button>
        </div>

        {/* Variable Picker Dropdown */}
        {showVariablePicker && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowVariablePicker(false)}
            />
            {/* Picker */}
            <div
              ref={pickerRef}
              className="absolute z-50 top-10 right-0"
            >
              <VariablePicker
                onSelect={handleInsertVariable}
                fields={fields}
                actionResults={actionResults}
                tableId={tableId}
              />
            </div>
          </>
        )}
      </div>

      {/* Used Variables */}
      {usedVariables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {usedVariables.map((varName, index) => (
            <span
              key={`${varName}-${index}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded"
            >
              <code>{varName}</code>
            </span>
          ))}
        </div>
      )}

      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default TemplateEditor;
