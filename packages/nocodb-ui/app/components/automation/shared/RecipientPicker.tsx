"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Search,
  X,
  User,
  Users,
  Mail,
  Database,
  Variable,
  Zap,
  ChevronDown,
  Plus,
  Check,
  AlertCircle,
  Table,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/app/components/ui/Input";
import { Select } from "@/app/components/ui/Select";
import type {
  Recipient,
  RecipientSourceType,
  RecipientPickerConfig,
  SystemUser,
  TableUserField,
  RecipientVariable,
} from "@/app/composables/useAutomation/recipientTypes";
import {
  createStaticRecipient,
  createSystemUserRecipient,
  createTableFieldRecipient,
  createVariableRecipient,
  createTriggerUserRecipient,
  createRecipient,
  validateRecipient,
  RECIPIENT_SOURCE_LABELS,
  RECIPIENT_SOURCE_DESCRIPTIONS,
} from "@/app/composables/useAutomation/recipientTypes";
import {
  useSystemUsers,
} from "@/app/composables/useAutomation/useAutomationRecipients";
import { TableRecordPicker, type RecordItem } from "./TableRecordPicker";

// 表格信息类型
interface TableInfo {
  id: string;
  title: string;
}

// 表格记录类型
interface TableRecord {
  Id: string | number;
  [key: string]: any;
}

interface RecipientPickerProps {
  value: Recipient[];
  onChange: (recipients: Recipient[]) => void;
  config: RecipientPickerConfig;
  baseId: string;
  tableId: string;
  className?: string;
}

type TabType = "users" | "fields" | "records" | "variables" | "manual";

const sourceIcons: Record<RecipientSourceType, React.ElementType> = {
  static: Mail,
  system_user: User,
  table_field: Database,
  variable: Variable,
  trigger_user: Zap,
};

export function RecipientPicker({
  value,
  onChange,
  config,
  baseId,
  tableId,
  className = "",
}: RecipientPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 表格记录选择器的值
  const [tableRecordPickerValue, setTableRecordPickerValue] = useState<RecordItem[]>([]);

  // API Hooks - 获取系统用户
  const {
    users: apiUsers,
    loading: usersLoading,
  } = useSystemUsers({ baseId, enabled: !!baseId });

  // 合并配置中的用户和 API 获取的用户
  const systemUsers = useMemo(() => {
    const configUsers = config.systemUsers || [];
    // 去重：优先使用 API 获取的用户
    const userMap = new Map<string, SystemUser>();
    apiUsers.forEach((u) => userMap.set(u.id, u));
    configUsers.forEach((u) => {
      if (!userMap.has(u.id)) userMap.set(u.id, u);
    });
    return Array.from(userMap.values());
  }, [config.systemUsers, apiUsers]);

  // 处理 TableRecordPicker 的变化
  const handleTableRecordPickerChange = useCallback(
    (records: RecordItem[]) => {
      setTableRecordPickerValue(records);
      // 将选中的记录转换为 Recipient
      const newRecipients: Recipient[] = [];
      records.forEach((record) => {
        const email = record.displayValue;
        if (!email) return;
        
        // 检查是否已存在
        const exists = value.some(
          (r) => r.type === "static" && r.value === email
        );
        if (exists) return;

        newRecipients.push(createStaticRecipient(email));
      });
      
      if (newRecipients.length > 0) {
        onChange([...value, ...newRecipients]);
      }
    },
    [value, onChange]
  );

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 过滤系统用户
  const filteredUsers = useMemo(() => {
    if (!systemUsers.length) return [];
    if (!searchQuery) return systemUsers;
    
    const query = searchQuery.toLowerCase();
    return systemUsers.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        user.display_name?.toLowerCase().includes(query)
    );
  }, [systemUsers, searchQuery]);

  // 过滤用户字段
  const filteredFields = useMemo(() => {
    if (!config.userFields) return [];
    if (!searchQuery) return config.userFields;
    
    const query = searchQuery.toLowerCase();
    return config.userFields.filter(
      (field) =>
        field.fieldTitle.toLowerCase().includes(query) ||
        field.tableName.toLowerCase().includes(query)
    );
  }, [config.userFields, searchQuery]);

  // 过滤变量
  const filteredVariables = useMemo(() => {
    if (!config.availableVariables) return [];
    if (!searchQuery) return config.availableVariables;
    
    const query = searchQuery.toLowerCase();
    return config.availableVariables.filter(
      (v) =>
        v.variablePath.toLowerCase().includes(query) ||
        v.label.toLowerCase().includes(query)
    );
  }, [config.availableVariables, searchQuery]);

  // 添加接收人
  const handleAddRecipient = useCallback(
    (recipient: Recipient) => {
      // 检查是否已存在
      const exists = value.some(
        (r) => r.type === recipient.type && r.value === recipient.value
      );
      if (exists) return;

      // 检查数量限制
      if (config.maxCount && value.length >= config.maxCount) return;

      onChange([...value, recipient]);
    },
    [value, onChange, config.maxCount]
  );

  // 移除接收人
  const handleRemoveRecipient = useCallback(
    (recipientId: string) => {
      onChange(value.filter((r) => r.id !== recipientId));
    },
    [value, onChange]
  );

  // 添加系统用户
  const handleAddSystemUser = useCallback(
    (user: SystemUser) => {
      handleAddRecipient(createSystemUserRecipient(user));
    },
    [handleAddRecipient]
  );

  // 添加表格字段
  const handleAddTableField = useCallback(
    (field: TableUserField) => {
      handleAddRecipient(createTableFieldRecipient(field));
    },
    [handleAddRecipient]
  );

  // 添加变量
  const handleAddVariable = useCallback(
    (variable: RecipientVariable) => {
      handleAddRecipient(
        createVariableRecipient(
          variable.variablePath,
          variable.label,
          variable.sourceActionId,
          variable.sourceActionLabel
        )
      );
    },
    [handleAddRecipient]
  );

  // 添加触发用户
  const handleAddTriggerUser = useCallback(() => {
    handleAddRecipient(createTriggerUserRecipient());
  }, [handleAddRecipient]);

  // 添加手动邮箱
  const handleAddManualEmail = useCallback(() => {
    const email = manualEmail.trim();
    if (!email) return;

    const recipient = createStaticRecipient(email);
    const validation = validateRecipient(recipient);
    
    if (!validation.valid) {
      setManualError(validation.error || "无效的邮箱");
      return;
    }

    handleAddRecipient(recipient);
    setManualEmail("");
    setManualError(null);
  }, [manualEmail, handleAddRecipient]);

  // 检查是否已选择
  const isSelected = useCallback(
    (type: RecipientSourceType, recipientValue: string) => {
      return value.some((r: Recipient) => r.type === type && r.value === recipientValue);
    },
    [value]
  );

  // 获取接收人显示信息
  const getRecipientDisplay = (recipient: Recipient) => {
    const Icon = sourceIcons[recipient.type];
    let label = recipient.label || recipient.value;
    let subtitle = "";

    switch (recipient.type) {
      case "static":
        subtitle = "邮箱";
        break;
      case "system_user":
        subtitle = recipient.metadata?.userEmail || "系统用户";
        break;
      case "table_field":
        subtitle = `${recipient.metadata?.tableName || ""} 字段`;
        break;
      case "variable":
        subtitle = recipient.metadata?.sourceActionLabel || "变量";
        break;
      case "trigger_user":
        subtitle = "触发用户";
        break;
    }

    return { Icon, label, subtitle };
  };

  // 可用的 tab
  const availableTabs = useMemo(() => {
    const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [];
    
    // 用户标签始终显示（从 API 加载）
    tabs.push({ id: "users", label: "用户", icon: Users });
    
    if (config.userFields?.length) {
      tabs.push({ id: "fields", label: "字段", icon: Database });
    }
    
    // 表格记录标签 - 允许选择表格并获取记录
    if (baseId) {
      tabs.push({ id: "records", label: "表格", icon: Table });
    }
    
    if (config.availableVariables?.length) {
      tabs.push({ id: "variables", label: "变量", icon: Variable });
    }
    if (config.allowManualInput !== false) {
      tabs.push({ id: "manual", label: "手动", icon: Mail });
    }
    
    return tabs;
  }, [config, baseId]);

  // 默认 tab
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Recipients */}
      <div
        className="min-h-[42px] px-3 py-2 border border-gray-200 rounded-lg bg-white cursor-pointer hover:border-gray-300 transition-colors"
        onClick={() => setIsOpen(true)}
      >
        {value.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{config.placeholder || "选择接收人..."}</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {value.map((recipient) => {
              const { Icon, label, subtitle } = getRecipientDisplay(recipient);
              return (
                <div
                  key={recipient.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="max-w-[150px] truncate">{label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRecipient(recipient.id);
                    }}
                    className="p-0.5 hover:bg-blue-100 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>添加</span>
            </button>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Tabs */}
          {availableTabs.length > 1 && (
            <div className="flex border-b border-gray-100">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                    activeTab === tab.id
                      ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Search (for users/fields/variables tabs) */}
          {activeTab !== "manual" && activeTab !== "records" && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className="pl-8 text-sm h-8"
                />
              </div>
            </div>
          )}

          {/* Loading indicator for users tab */}
          {activeTab === "users" && usersLoading && (
            <div className="flex items-center justify-center py-2 text-gray-400 text-sm border-b border-gray-100">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              加载用户...
            </div>
          )}

          {/* Content */}
          <div className="max-h-[280px] overflow-auto">
            {/* System Users */}
            {activeTab === "users" && (
              <>
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    没有找到用户
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const selected = value.some(
                      (r) => r.type === "system_user" && r.value === user.id
                    );
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleAddSystemUser(user)}
                        disabled={selected}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {user.display_name || user.email}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        {selected && <Check className="w-4 h-4 text-blue-500" />}
                      </button>
                    );
                  })
                )}
              </>
            )}

            {/* Table Fields */}
            {activeTab === "fields" && (
              <>
                {filteredFields.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    没有找到用户或邮箱字段
                  </div>
                ) : (
                  filteredFields.map((field) => {
                    const selected = value.some(
                      (r) => r.type === "table_field" && r.value === field.fieldId
                    );
                    return (
                      <button
                        key={field.fieldId}
                        type="button"
                        onClick={() => handleAddTableField(field)}
                        disabled={selected}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          {field.fieldType === "user" ? (
                            <User className="w-4 h-4 text-green-600" />
                          ) : (
                            <Mail className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {field.fieldTitle}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {field.tableName} · {field.fieldType === "user" ? "用户字段" : "邮箱字段"}
                            {field.isMultiple && " · 多选"}
                          </p>
                        </div>
                        {selected && <Check className="w-4 h-4 text-blue-500" />}
                      </button>
                    );
                  })
                )}
              </>
            )}

            {/* Table Records - 使用 TableRecordPicker 组件 */}
            {activeTab === "records" && (
              <div className="p-3">
                <TableRecordPicker
                  baseId={baseId}
                  value={tableRecordPickerValue}
                  onChange={handleTableRecordPickerChange}
                  multiple={true}
                  placeholder="从表格中选择用户/邮箱数据..."
                />
              </div>
            )}

            {/* Variables */}
            {activeTab === "variables" && (
              <>
                {filteredVariables.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    没有可用的变量
                  </div>
                ) : (
                  filteredVariables.map((variable) => {
                    const selected = value.some(
                      (r) => r.type === "variable" && r.value === variable.variablePath
                    );
                    return (
                      <button
                        key={variable.variablePath}
                        type="button"
                        onClick={() => handleAddVariable(variable)}
                        disabled={selected}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left disabled:opacity-50"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Variable className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {variable.label}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            <code>{`{{${variable.variablePath}}}`}</code>
                            {variable.sourceActionLabel && ` · 来自 ${variable.sourceActionLabel}`}
                          </p>
                        </div>
                        {selected && <Check className="w-4 h-4 text-blue-500" />}
                      </button>
                    );
                  })
                )}
              </>
            )}

            {/* Manual Input */}
            {activeTab === "manual" && (
              <div className="p-3">
                <p className="text-xs text-gray-500 mb-2">手动输入邮箱地址</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => {
                        setManualEmail(e.target.value);
                        setManualError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddManualEmail();
                        }
                      }}
                      placeholder="email@example.com"
                      className={`h-9 ${manualError ? "border-red-300" : ""}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddManualEmail}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    添加
                  </button>
                </div>
                {manualError && (
                  <div className="flex items-center gap-1 mt-1.5 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">{manualError}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  提示：也可以使用变量，如 {`{{record.email}}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipientPicker;
