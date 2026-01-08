# 自动化系统使用指南

## 概述

NocoDB-UI 自动化系统提供了类似飞书多维表格的自动化功能，支持：

- **多种触发器**: 记录事件、字段变化、定时任务、Webhook 等
- **丰富的动作**: 更新记录、发送通知、调用 API、条件分支等
- **可视化编辑**: 直观的工作流编辑界面
- **执行日志**: 完整的执行历史和调试信息

---

## 快速开始

### 1. 安装依赖

```bash
# 在 nocodb-ui 目录下
pnpm add @xyflow/react  # 可选，用于工作流可视化
```

### 2. 基础使用

```tsx
import { useAutomation, AutomationProvider } from "@/app/composables";
import { AutomationList, AutomationButton } from "@/app/components/automation";

// 方式一：使用 Provider
function App() {
  return (
    <AutomationProvider baseId="base-id">
      <YourComponent />
    </AutomationProvider>
  );
}

// 方式二：直接使用 Hook
function YourComponent() {
  const {
    automationsList,
    isLoading,
    loadAutomations,
    createAutomation,
    updateAutomation,
    deleteAutomation,
  } = useAutomation("base-id");

  // ...
}
```

### 3. 在表格工具栏添加自动化按钮

```tsx
import { AutomationButton } from "@/app/components/automation";

function TableToolbar({ baseId, tableId }) {
  return (
    <div className="toolbar">
      {/* 其他工具 */}
      <AutomationButton baseId={baseId} tableId={tableId} />
    </div>
  );
}
```

---

## 组件 API

### AutomationList

自动化列表组件，显示所有自动化并支持管理操作。

```tsx
interface AutomationListProps {
  baseId: string;           // Base ID
  tableId?: string;         // 可选，筛选特定表格的自动化
  onCreateNew?: () => void; // 创建新自动化回调
  onEdit?: (automation: Automation) => void;
  onViewLogs?: (automation: Automation) => void;
}

<AutomationList
  baseId="base-123"
  tableId="table-456"
  onCreateNew={() => setShowEditor(true)}
  onEdit={(automation) => handleEdit(automation)}
/>
```

### AutomationEditor

自动化编辑器，用于创建和编辑自动化。

```tsx
interface AutomationEditorProps {
  automation?: Automation;  // 编辑时传入现有自动化
  tableId: string;
  baseId: string;
  onSave: (data: CreateAutomationRequest | UpdateAutomationRequest) => Promise<void>;
  onCancel: () => void;
  onTest?: (automation: Automation) => void;
  isSaving?: boolean;
}

<AutomationEditor
  automation={selectedAutomation}
  tableId="table-456"
  baseId="base-123"
  onSave={handleSave}
  onCancel={() => setShowEditor(false)}
  isSaving={isSaving}
/>
```

### AutomationButton

快捷入口按钮，适合放在表格工具栏。

```tsx
interface AutomationButtonProps {
  baseId: string;
  tableId: string;
  variant?: "default" | "compact" | "icon";
  onCreateNew?: () => void;
  onManage?: () => void;
}

// 默认样式
<AutomationButton baseId="base-123" tableId="table-456" />

// 紧凑样式
<AutomationButton baseId="base-123" tableId="table-456" variant="compact" />

// 图标样式
<AutomationButton baseId="base-123" tableId="table-456" variant="icon" />
```

### AutomationLogs

执行日志查看组件。

```tsx
interface AutomationLogsProps {
  automationId: string;
  automationTitle?: string;
  onClose?: () => void;
}

<AutomationLogs
  automationId="automation-789"
  automationTitle="我的自动化"
  onClose={() => setShowLogs(false)}
/>
```

### ConditionBuilder

条件构建器，用于配置触发条件或动作条件。

```tsx
interface ConditionBuilderProps {
  value?: FilterGroup;
  tableId: string;
  onChange: (value: FilterGroup | undefined) => void;
  fields?: FieldInfo[];
}

<ConditionBuilder
  value={trigger.conditions}
  tableId="table-456"
  onChange={(conditions) => setTrigger({ ...trigger, conditions })}
  fields={tableFields}
/>
```

### TemplateEditor

支持变量插入的模板编辑器。

```tsx
interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  fields?: FieldInfo[];
  label?: string;
  hint?: string;
}

<TemplateEditor
  value={emailBody}
  onChange={setEmailBody}
  label="邮件内容"
  hint="支持变量，如 {record.name}"
  fields={tableFields}
/>
```

---

## Hook API

### useAutomation

```tsx
const {
  // 状态
  automations,           // Map<string, Automation>
  currentAutomation,     // Automation | null
  automationLogs,        // Map<string, AutomationLog[]>
  isLoading,
  isLoadingLogs,
  isSaving,
  error,

  // 计算属性
  automationsList,       // Automation[] - 排序后的列表
  activeAutomations,     // Automation[] - 仅活跃的
  tableAutomations,      // (tableId: string) => Automation[]

  // 操作方法
  loadAutomations,       // 加载列表
  loadAutomation,        // 加载单个
  createAutomation,      // 创建
  updateAutomation,      // 更新
  deleteAutomation,      // 删除
  duplicateAutomation,   // 复制
  toggleActive,          // 切换启用状态
  testAutomation,        // 测试
  triggerAutomation,     // 手动触发
  loadAutomationLogs,    // 加载日志
  setCurrentAutomation,
  clearError,
  reset,
} = useAutomation(baseId);
```

---

## 类型定义

### Automation

```typescript
interface Automation {
  id: string;
  title: string;
  description?: string;
  base_id: string;
  fk_model_id: string;
  status: "active" | "inactive" | "error";
  is_active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  last_run_at?: string;
  run_count: number;
  success_count: number;
  error_count: number;
}
```

### TriggerType

```typescript
type TriggerType =
  | "record.created"      // 记录创建
  | "record.updated"      // 记录更新
  | "record.deleted"      // 记录删除
  | "field.changed"       // 字段变化
  | "button.clicked"      // 按钮点击
  | "form.submitted"      // 表单提交
  | "schedule.cron"       // 定时触发
  | "schedule.interval"   // 间隔触发
  | "webhook.received";   // Webhook
```

### ActionType

```typescript
type ActionType =
  | "record.update"          // 更新记录
  | "record.create"          // 创建记录
  | "record.delete"          // 删除记录
  | "notification.email"     // 发送邮件
  | "notification.webhook"   // 调用 Webhook
  | "notification.slack"     // Slack
  | "notification.feishu"    // 飞书
  | "notification.dingtalk"  // 钉钉
  | "notification.wechat"    // 企业微信
  | "script.run"             // 脚本
  | "flow.condition"         // 条件分支
  | "flow.delay"             // 延迟
  | "flow.loop";             // 循环
```

---

## 工具函数

```typescript
import {
  generateId,
  parseTemplateVariables,
  renderTemplate,
  validateAutomation,
  evaluateFilterGroup,
  formatDuration,
  formatDateTime,
  createDefaultTrigger,
  createDefaultAction,
  createEmptyAutomation,
} from "@/app/components/automation";

// 解析模板变量
const variables = parseTemplateVariables("Hello {record.name}!");
// => ["record.name"]

// 渲染模板
const result = renderTemplate("Hello {record.name}!", {
  record: { name: "Alice" }
});
// => "Hello Alice!"

// 验证自动化
const { valid, errors } = validateAutomation(automationData);

// 评估条件
const matches = evaluateFilterGroup(filterGroup, recordData);
```

---

## 文件结构

```
app/
├── composables/
│   └── useAutomation/
│       ├── index.tsx        # Hook 实现
│       └── types.ts         # 类型定义
│
├── components/
│   └── automation/
│       ├── index.ts         # 导出
│       ├── AutomationCard.tsx
│       ├── AutomationList.tsx
│       ├── AutomationEditor.tsx
│       ├── AutomationLogs.tsx
│       ├── AutomationButton.tsx
│       │
│       ├── trigger/
│       │   └── TriggerConfig.tsx
│       │
│       ├── action/
│       │   ├── ActionList.tsx
│       │   └── ActionConfig.tsx
│       │
│       ├── condition/
│       │   └── ConditionBuilder.tsx
│       │
│       ├── shared/
│       │   ├── VariablePicker.tsx
│       │   └── TemplateEditor.tsx
│       │
│       └── utils/
│           ├── constants.ts
│           └── helpers.ts
│
└── (workspace)/
    └── workspace/
        └── [baseId]/
            └── automations/
                └── page.tsx  # 自动化管理页面
```

---

## 后端 API 要求

自动化系统需要后端提供以下 API：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v3/meta/bases/:baseId/automations` | 获取自动化列表 |
| POST | `/api/v3/meta/bases/:baseId/automations` | 创建自动化 |
| GET | `/api/v3/meta/automations/:id` | 获取单个自动化 |
| PATCH | `/api/v3/meta/automations/:id` | 更新自动化 |
| DELETE | `/api/v3/meta/automations/:id` | 删除自动化 |
| POST | `/api/v3/meta/automations/:id/test` | 测试自动化 |
| POST | `/api/v3/meta/automations/:id/trigger` | 手动触发 |
| POST | `/api/v3/meta/automations/:id/duplicate` | 复制自动化 |
| GET | `/api/v3/meta/automations/:id/logs` | 获取执行日志 |

---

## 待完成功能

- [ ] 集成 @xyflow/react 实现可视化工作流画布
- [ ] 完善字段选择器组件（需要集成 useTables hook）
- [ ] 实现脚本编辑器（集成 Monaco Editor）
- [ ] 添加自动化模板功能
- [ ] 实现批量操作
- [ ] 添加导入/导出功能

---

## 注意事项

1. **后端 API**: 当前前端代码已完成，但需要后端实现相应的 API 接口
2. **字段选择**: 字段选择器需要与 `useTables` hook 集成以获取表格字段信息
3. **依赖安装**: 如需工作流可视化，请安装 `@xyflow/react`

---

**文档版本**: 1.0  
**最后更新**: 2026-01-08
