"use client";

import { useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import { Button } from "@/app/components/ui/Button";
import { Dropdown, DropdownItem } from "@/app/components/ui/Dropdown";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type { FieldMapping } from "@/app/composables/useAutomation/types";

export type { FieldMapping };

interface FieldMappingEditorProps {
  mappings: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
  sourceFields: FieldInfo[];
  targetFields: FieldInfo[];
  mode?: "update" | "create";
}

function generateId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

export function FieldMappingEditor({
  mappings,
  onChange,
  sourceFields,
  targetFields,
}: FieldMappingEditorProps) {
  const unmappedFields = useMemo(() => {
    const mappedIds = new Set(mappings.map((m) => m.target_field_id));
    return targetFields.filter((f) => !mappedIds.has(f.id) && !f.system && !f.pv);
  }, [targetFields, mappings]);

  const handleAddField = useCallback((fieldId: string) => {
    const newMapping: FieldMapping = {
      id: generateId(),
      target_field_id: fieldId,
      value_type: "field",
      source_field_id: sourceFields.find((s) => s.id === fieldId)?.id || "",
    };
    onChange([...mappings, newMapping]);
  }, [mappings, onChange, sourceFields]);

  const handleUpdate = useCallback((id: string, updates: Partial<FieldMapping>) => {
    onChange(mappings.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, [mappings, onChange]);

  const handleDelete = useCallback((id: string) => {
    onChange(mappings.filter((m) => m.id !== id));
  }, [mappings, onChange]);

  const sourceFieldOptions = useMemo(() => 
    sourceFields.filter((f) => !f.system).map((f) => ({ value: f.id, label: f.title })),
    [sourceFields]
  );

  return (
    <div className="space-y-3">
      {/* Mappings */}
      {mappings.map((mapping) => {
        const targetField = targetFields.find((f) => f.id === mapping.target_field_id);
        return (
          <MappingItem
            key={mapping.id}
            mapping={mapping}
            targetField={targetField}
            sourceFieldOptions={sourceFieldOptions}
            onUpdate={(updates) => handleUpdate(mapping.id, updates)}
            onDelete={() => handleDelete(mapping.id)}
          />
        );
      })}

      {/* Add field dropdown */}
      {unmappedFields.length > 0 && (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 !px-2">
              <Plus className="w-4 h-4 mr-1" />
              添加字段
            </Button>
          }
        >
          {unmappedFields.map((field) => (
            <DropdownItem key={field.id} onClick={() => handleAddField(field.id)}>
              {field.title}
            </DropdownItem>
          ))}
        </Dropdown>
      )}

      {mappings.length === 0 && (
        <p className="text-sm text-gray-400">点击添加字段设置值</p>
      )}
    </div>
  );
}

interface MappingItemProps {
  mapping: FieldMapping;
  targetField?: FieldInfo;
  sourceFieldOptions: Array<{ value: string; label: string }>;
  onUpdate: (updates: Partial<FieldMapping>) => void;
  onDelete: () => void;
}

function MappingItem({
  mapping,
  targetField,
  sourceFieldOptions,
  onUpdate,
  onDelete,
}: MappingItemProps) {
  return (
    <div className="flex items-center gap-2 group">
      {/* Target field label */}
      <span className="text-sm font-medium text-gray-700 w-28 truncate shrink-0">
        {targetField?.title || "字段"}
      </span>

      <span className="text-gray-300">=</span>

      {/* Value config */}
      <div className="flex-1 min-w-0">
        {mapping.value_type === "field" ? (
          <Select
            value={mapping.source_field_id || ""}
            onChange={(v) => onUpdate({ source_field_id: v })}
            options={sourceFieldOptions}
            placeholder="选择来源字段"
            size="sm"
          />
        ) : (
          <Input
            value={mapping.static_value || ""}
            onChange={(e) => onUpdate({ static_value: e.target.value })}
            placeholder="输入固定值"
            className="!py-1.5 text-sm"
          />
        )}
      </div>

      {/* Value type toggle */}
      <Select
        value={mapping.value_type}
        onChange={(v) => onUpdate({ value_type: v as FieldMapping["value_type"] })}
        options={[
          { value: "field", label: "字段" },
          { value: "static", label: "固定值" },
        ]}
        size="sm"
        className="w-24"
      />

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 !p-1.5"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default FieldMappingEditor;
