"use client";

import { useState, useEffect, useCallback } from "react";
import { TableSelector, type TableInfo } from "../shared/TableSelector";
import { FieldMappingEditor } from "../shared/FieldMappingEditor";
import type { FieldInfo } from "@/app/composables/useTableColumns";
import type { ActionConfig, FieldMapping } from "@/app/composables/useAutomation/types";

interface RecordCreateConfigProps {
  config: ActionConfig;
  onChange: (config: ActionConfig) => void;
  tables: TableInfo[];
  currentTableId: string;
  getFieldsForTable: (tableId: string) => FieldInfo[];
  triggerFields: FieldInfo[];
}

export function RecordCreateConfig({
  config,
  onChange,
  tables,
  currentTableId,
  getFieldsForTable,
  triggerFields,
}: RecordCreateConfigProps) {
  const targetTableId = config.target_table_id || currentTableId;
  const [targetFields, setTargetFields] = useState<FieldInfo[]>([]);

  useEffect(() => {
    const fields = getFieldsForTable(targetTableId);
    setTargetFields(fields);
  }, [targetTableId, getFieldsForTable]);

  const handleTableChange = useCallback(
    (tableId: string) => {
      onChange({ ...config, target_table_id: tableId, field_mappings: [] });
    },
    [config, onChange]
  );

  const handleMappingsChange = useCallback(
    (mappings: FieldMapping[]) => {
      onChange({ ...config, field_mappings: mappings });
    },
    [config, onChange]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">在目标表中创建一条新记录</p>

      <TableSelector
        tables={tables}
        value={targetTableId}
        onChange={handleTableChange}
        label="目标表格"
        currentTableId={currentTableId}
      />

      <div>
        <label className="block text-sm text-gray-600 mb-2">设置字段值</label>
        <FieldMappingEditor
          mappings={config.field_mappings || []}
          onChange={handleMappingsChange}
          sourceFields={triggerFields}
          targetFields={targetFields.filter((f) => !f.system && !f.pv)}
          mode="create"
        />
      </div>

      {(!config.field_mappings || config.field_mappings.length === 0) && (
        <p className="text-xs text-gray-400">请选择要填充的字段</p>
      )}
    </div>
  );
}

export default RecordCreateConfig;
