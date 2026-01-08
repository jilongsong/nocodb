# NocoDB 自动化系统设计方案

## 一、现有系统分析

### 1.1 NocoDB 当前 Webhook 系统

**前端 (nc-gui):**
| 文件 | 功能 |
|------|------|
| `store/webhooks.ts` | Webhook 状态管理 (CRUD) |
| `store/automation.ts` | 自动化 store (存根实现，未完善) |
| `components/webhook/index.vue` | Webhook 配置 UI |
| `components/webhook/WebhookV2.vue` | V2 版本 Webhook 组件 |

**后端 (nocodb):**
| 文件 | 功能 |
|------|------|
| `models/Hook.ts` | Hook 数据模型 |
| `models/Script.ts` | 脚本模型 (存根实现) |
| `services/hooks.service.ts` | Webhook 服务层 |
| `services/hook-handler.service.ts` | 事件处理和触发 |
| `utils/webhook-invoker.ts` | Webhook 调用逻辑 |
| `helpers/webhookHelpers.ts` | 条件验证、HTTP 调用 |

**当前支持的功能:**
- ✅ 触发事件: `after.insert`, `after.update`, `after.delete`, `manual.trigger`
- ✅ 条件筛选 (基于记录数据)
- ✅ 通知渠道: URL, Email, Slack, Microsoft Teams, Discord, Mattermost, Twilio
- ✅ 脚本执行 (基础支持)
- ✅ Webhook 日志
- ⚠️ 自动化脚本 (部分实现)
- ❌ 可视化工作流编辑器
- ❌ 多步骤工作流
- ❌ 条件分支
- ❌ 定时触发

### 1.2 飞书多维表格自动化特性

飞书自动化的核心特点:
1. **可视化工作流**: 拖拽式触发器-动作链
2. **丰富的触发器**: 记录事件、定时、Webhook、按钮点击
3. **多样的动作**: 更新记录、发送通知、调用 API、创建记录、发送消息
4. **条件分支**: 基于条件执行不同路径
5. **多步骤工作流**: 串联多个动作
6. **字段级变更检测**: 特定字段变化时触发
7. **执行历史**: 详细的执行日志和调试信息

---

## 二、新自动化系统架构设计

### 2.1 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                      Automation (自动化)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ Trigger │───▶│  Condition  │───▶│       Actions       │ │
│  │  触发器  │    │    条件     │    │        动作         │ │
│  └─────────┘    └─────────────┘    └─────────────────────┘ │
│                                              │              │
│                                              ▼              │
│                                    ┌─────────────────────┐ │
│                                    │   Action Chain      │ │
│                                    │   动作链 (可串联)    │ │
│                                    └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据模型设计

#### Automation (自动化)
```typescript
interface Automation {
  id: string;
  title: string;
  description?: string;
  base_id: string;
  fk_model_id: string;      // 关联的表
  is_active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  created_by: string;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  run_count: number;
  error_count: number;
}
```

#### Trigger (触发器)
```typescript
type TriggerType = 
  | 'record.created'      // 记录创建
  | 'record.updated'      // 记录更新
  | 'record.deleted'      // 记录删除
  | 'field.changed'       // 特定字段变化
  | 'button.clicked'      // 按钮点击
  | 'form.submitted'      // 表单提交
  | 'schedule.cron'       // 定时触发
  | 'schedule.interval'   // 间隔触发
  | 'webhook.received';   // 外部 Webhook

interface AutomationTrigger {
  id: string;
  type: TriggerType;
  config: TriggerConfig;
  conditions?: FilterGroup;  // 触发条件
}

interface TriggerConfig {
  // 字段变化触发器
  watch_fields?: string[];          // 监听的字段 ID
  
  // 定时触发器
  cron_expression?: string;         // Cron 表达式
  interval_minutes?: number;        // 间隔分钟数
  timezone?: string;                // 时区
  
  // 表单触发器
  form_view_id?: string;            // 关联的表单视图
  
  // Webhook 触发器
  webhook_secret?: string;          // Webhook 密钥
}
```

#### Action (动作)
```typescript
type ActionType =
  | 'record.update'          // 更新当前记录
  | 'record.create'          // 创建新记录
  | 'record.delete'          // 删除记录
  | 'notification.email'     // 发送邮件
  | 'notification.webhook'   // 调用 Webhook
  | 'notification.slack'     // 发送 Slack 消息
  | 'notification.feishu'    // 发送飞书消息
  | 'notification.dingtalk'  // 发送钉钉消息
  | 'notification.wechat'    // 发送企业微信消息
  | 'script.run'             // 运行脚本
  | 'flow.condition'         // 条件分支
  | 'flow.delay'             // 延迟执行
  | 'flow.loop';             // 循环执行

interface AutomationAction {
  id: string;
  type: ActionType;
  order: number;
  config: ActionConfig;
  on_error: 'stop' | 'continue' | 'retry';
  retry_count?: number;
  next_action_id?: string;         // 下一个动作 (用于条件分支)
  true_branch_id?: string;         // 条件为真时的分支
  false_branch_id?: string;        // 条件为假时的分支
}

interface ActionConfig {
  // 记录操作
  target_table_id?: string;        // 目标表
  field_mappings?: FieldMapping[]; // 字段映射
  
  // 通知操作
  recipients?: string[];           // 收件人
  subject_template?: string;       // 主题模板
  body_template?: string;          // 内容模板
  webhook_url?: string;            // Webhook URL
  webhook_method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  webhook_headers?: Record<string, string>;
  
  // 条件分支
  condition?: FilterGroup;
  
  // 延迟
  delay_seconds?: number;
  
  // 脚本
  script_id?: string;
  script_params?: Record<string, any>;
}

interface FieldMapping {
  target_field_id: string;
  value_type: 'static' | 'field' | 'formula' | 'variable';
  value: string;
}
```

#### Execution Log (执行日志)
```typescript
interface AutomationLog {
  id: string;
  automation_id: string;
  trigger_type: TriggerType;
  trigger_data: Record<string, any>;
  status: 'pending' | 'running' | 'success' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  action_logs: ActionLog[];
  error?: string;
  triggered_by?: string;
}

interface ActionLog {
  action_id: string;
  action_type: ActionType;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  started_at: string;
  completed_at?: string;
}
```

### 2.3 系统架构图

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Frontend (nocodb-ui)                          │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │
│  │  Automation List │  │  Workflow Editor │  │   Execution Logs     │ │
│  │    自动化列表     │  │    工作流编辑器    │  │      执行日志        │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                        useAutomation Hook                         │ │
│  │   - loadAutomations()  - createAutomation()  - updateAutomation() │ │
│  │   - deleteAutomation() - toggleActive()      - testAutomation()   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          Backend API (REST)                             │
├────────────────────────────────────────────────────────────────────────┤
│  POST   /api/v3/automations                 创建自动化                  │
│  GET    /api/v3/automations                 获取自动化列表              │
│  GET    /api/v3/automations/:id             获取单个自动化              │
│  PATCH  /api/v3/automations/:id             更新自动化                  │
│  DELETE /api/v3/automations/:id             删除自动化                  │
│  POST   /api/v3/automations/:id/test        测试自动化                  │
│  POST   /api/v3/automations/:id/trigger     手动触发                    │
│  GET    /api/v3/automations/:id/logs        获取执行日志                │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Backend Services                                │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐                      │
│  │ AutomationService   │  │ TriggerService      │                      │
│  │  - CRUD Operations  │  │  - Event Listeners  │                      │
│  │  - Validation       │  │  - Cron Scheduler   │                      │
│  └─────────────────────┘  └─────────────────────┘                      │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐                      │
│  │ ExecutionEngine     │  │ ActionExecutor      │                      │
│  │  - Workflow Runner  │  │  - Record Actions   │                      │
│  │  - Condition Eval   │  │  - Notifications    │                      │
│  │  - Branch Handler   │  │  - Webhooks         │                      │
│  └─────────────────────┘  └─────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           Job Queue (Bull)                              │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐│
│  │ AutomationQueue │  │ SchedulerQueue  │  │ NotificationQueue       ││
│  │   执行自动化     │  │   定时任务队列   │  │     通知队列            ││
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 三、前端组件设计

### 3.1 目录结构

```
nocodb-ui/app/
├── components/
│   └── automation/
│       ├── AutomationList.tsx           # 自动化列表
│       ├── AutomationCard.tsx           # 自动化卡片
│       ├── AutomationEditor.tsx         # 自动化编辑器主组件
│       ├── AutomationLogs.tsx           # 执行日志
│       │
│       ├── workflow/
│       │   ├── WorkflowCanvas.tsx       # 工作流画布
│       │   ├── WorkflowNode.tsx         # 工作流节点
│       │   ├── WorkflowEdge.tsx         # 节点连接线
│       │   └── WorkflowMinimap.tsx      # 小地图
│       │
│       ├── trigger/
│       │   ├── TriggerSelector.tsx      # 触发器选择器
│       │   ├── TriggerConfig.tsx        # 触发器配置
│       │   ├── RecordTrigger.tsx        # 记录触发器配置
│       │   ├── ScheduleTrigger.tsx      # 定时触发器配置
│       │   ├── WebhookTrigger.tsx       # Webhook 触发器配置
│       │   └── FieldChangeTrigger.tsx   # 字段变化触发器
│       │
│       ├── action/
│       │   ├── ActionSelector.tsx       # 动作选择器
│       │   ├── ActionConfig.tsx         # 动作配置
│       │   ├── RecordAction.tsx         # 记录操作配置
│       │   ├── NotificationAction.tsx   # 通知动作配置
│       │   ├── WebhookAction.tsx        # Webhook 动作配置
│       │   ├── ConditionAction.tsx      # 条件分支配置
│       │   └── DelayAction.tsx          # 延迟动作配置
│       │
│       ├── condition/
│       │   ├── ConditionBuilder.tsx     # 条件构建器
│       │   ├── ConditionGroup.tsx       # 条件组
│       │   └── ConditionRow.tsx         # 单个条件
│       │
│       └── shared/
│           ├── FieldSelector.tsx        # 字段选择器
│           ├── ValueInput.tsx           # 值输入组件
│           ├── TemplateEditor.tsx       # 模板编辑器 (支持变量)
│           └── VariablePicker.tsx       # 变量选择器
│
├── composables/
│   └── useAutomation/
│       ├── index.ts                     # 主 hook
│       ├── useAutomationList.ts         # 列表管理
│       ├── useAutomationEditor.ts       # 编辑器状态
│       ├── useAutomationLogs.ts         # 日志管理
│       └── types.ts                     # 类型定义
│
└── (workspace)/
    └── workspace/
        └── [baseId]/
            └── automations/
                ├── page.tsx             # 自动化列表页
                └── [automationId]/
                    ├── page.tsx         # 自动化编辑页
                    └── logs/
                        └── page.tsx     # 执行日志页
```

### 3.2 核心组件设计

#### AutomationEditor (自动化编辑器)

```tsx
// components/automation/AutomationEditor.tsx
interface AutomationEditorProps {
  automationId?: string;
  tableId: string;
  onSave?: (automation: Automation) => void;
  onCancel?: () => void;
}

export function AutomationEditor({ 
  automationId, 
  tableId, 
  onSave, 
  onCancel 
}: AutomationEditorProps) {
  const [automation, setAutomation] = useState<Automation>(defaultAutomation);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  return (
    <div className="flex h-full">
      {/* 左侧: 工作流画布 */}
      <div className="flex-1 bg-gray-50">
        <WorkflowCanvas
          trigger={automation.trigger}
          actions={automation.actions}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
          onUpdateTrigger={handleUpdateTrigger}
          onUpdateAction={handleUpdateAction}
          onAddAction={handleAddAction}
          onDeleteAction={handleDeleteAction}
        />
      </div>
      
      {/* 右侧: 配置面板 */}
      <div className="w-96 border-l bg-white overflow-auto">
        {selectedNode === 'trigger' && (
          <TriggerConfig
            trigger={automation.trigger}
            tableId={tableId}
            onChange={handleUpdateTrigger}
          />
        )}
        {selectedNode && selectedNode !== 'trigger' && (
          <ActionConfig
            action={findAction(selectedNode)}
            tableId={tableId}
            onChange={(action) => handleUpdateAction(selectedNode, action)}
          />
        )}
      </div>
    </div>
  );
}
```

#### WorkflowCanvas (工作流画布)

```tsx
// components/automation/workflow/WorkflowCanvas.tsx
// 使用 @xyflow/react (原 reactflow) 实现可视化工作流

import { ReactFlow, Background, Controls } from '@xyflow/react';

export function WorkflowCanvas({
  trigger,
  actions,
  selectedNode,
  onSelectNode,
  onAddAction,
}: WorkflowCanvasProps) {
  const nodes = useMemo(() => buildNodes(trigger, actions), [trigger, actions]);
  const edges = useMemo(() => buildEdges(actions), [actions]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

#### TriggerConfig (触发器配置)

```tsx
// components/automation/trigger/TriggerConfig.tsx
export function TriggerConfig({ trigger, tableId, onChange }: TriggerConfigProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">触发器配置</h3>
      
      <TriggerSelector
        value={trigger.type}
        onChange={(type) => onChange({ ...trigger, type })}
      />
      
      {trigger.type === 'record.created' && (
        <RecordTrigger config={trigger.config} onChange={updateConfig} />
      )}
      
      {trigger.type === 'field.changed' && (
        <FieldChangeTrigger
          tableId={tableId}
          config={trigger.config}
          onChange={updateConfig}
        />
      )}
      
      {trigger.type === 'schedule.cron' && (
        <ScheduleTrigger config={trigger.config} onChange={updateConfig} />
      )}
      
      {/* 触发条件 */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">触发条件 (可选)</h4>
        <ConditionBuilder
          tableId={tableId}
          value={trigger.conditions}
          onChange={(conditions) => onChange({ ...trigger, conditions })}
        />
      </div>
    </div>
  );
}
```

### 3.3 useAutomation Hook

```typescript
// composables/useAutomation/index.ts
export function useAutomation(baseId: string) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const api = useApi();
  
  // 加载自动化列表
  const loadAutomations = useCallback(async (tableId?: string) => {
    setLoading(true);
    try {
      const response = await api.automation.list({ baseId, tableId });
      setAutomations(response.list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseId, api]);
  
  // 创建自动化
  const createAutomation = useCallback(async (data: CreateAutomationReq) => {
    const automation = await api.automation.create(baseId, data);
    setAutomations(prev => [...prev, automation]);
    return automation;
  }, [baseId, api]);
  
  // 更新自动化
  const updateAutomation = useCallback(async (
    id: string, 
    data: UpdateAutomationReq
  ) => {
    const automation = await api.automation.update(id, data);
    setAutomations(prev => 
      prev.map(a => a.id === id ? automation : a)
    );
    return automation;
  }, [api]);
  
  // 删除自动化
  const deleteAutomation = useCallback(async (id: string) => {
    await api.automation.delete(id);
    setAutomations(prev => prev.filter(a => a.id !== id));
  }, [api]);
  
  // 切换启用状态
  const toggleActive = useCallback(async (id: string, active: boolean) => {
    return updateAutomation(id, { is_active: active });
  }, [updateAutomation]);
  
  // 测试自动化
  const testAutomation = useCallback(async (
    id: string, 
    testData?: Record<string, any>
  ) => {
    return api.automation.test(id, { data: testData });
  }, [api]);
  
  // 手动触发
  const triggerAutomation = useCallback(async (
    id: string,
    recordId: string
  ) => {
    return api.automation.trigger(id, { recordId });
  }, [api]);
  
  return {
    automations,
    loading,
    error,
    loadAutomations,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleActive,
    testAutomation,
    triggerAutomation,
  };
}
```

---

## 四、后端服务设计

### 4.1 目录结构 (基于现有 nocodb 结构)

```
nocodb/src/
├── controllers/
│   └── automations.controller.ts
│
├── services/
│   ├── automations.service.ts
│   ├── automation-trigger.service.ts
│   └── automation-executor.service.ts
│
├── models/
│   ├── Automation.ts
│   ├── AutomationAction.ts
│   └── AutomationLog.ts
│
├── modules/
│   └── jobs/
│       └── jobs/
│           ├── automation-executor/
│           │   └── automation-executor.processor.ts
│           └── automation-scheduler/
│               └── automation-scheduler.processor.ts
│
└── meta/
    └── migrations/
        └── v2/
            └── nc_xxx_automation.ts
```

### 4.2 数据库表设计

```sql
-- 自动化主表
CREATE TABLE nc_automations (
  id VARCHAR(20) PRIMARY KEY,
  base_id VARCHAR(20) NOT NULL,
  fk_model_id VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_config JSON,
  trigger_conditions JSON,
  created_by VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_run_at TIMESTAMP,
  run_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  
  FOREIGN KEY (base_id) REFERENCES nc_bases(id) ON DELETE CASCADE,
  FOREIGN KEY (fk_model_id) REFERENCES nc_models(id) ON DELETE CASCADE
);

-- 自动化动作表
CREATE TABLE nc_automation_actions (
  id VARCHAR(20) PRIMARY KEY,
  fk_automation_id VARCHAR(20) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_config JSON,
  action_order INT NOT NULL,
  on_error VARCHAR(20) DEFAULT 'stop',
  retry_count INT DEFAULT 0,
  next_action_id VARCHAR(20),
  true_branch_id VARCHAR(20),
  false_branch_id VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (fk_automation_id) REFERENCES nc_automations(id) ON DELETE CASCADE
);

-- 执行日志表
CREATE TABLE nc_automation_logs (
  id VARCHAR(20) PRIMARY KEY,
  fk_automation_id VARCHAR(20) NOT NULL,
  trigger_type VARCHAR(50),
  trigger_data JSON,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INT,
  error TEXT,
  triggered_by VARCHAR(20),
  
  FOREIGN KEY (fk_automation_id) REFERENCES nc_automations(id) ON DELETE CASCADE
);

-- 动作执行日志表
CREATE TABLE nc_automation_action_logs (
  id VARCHAR(20) PRIMARY KEY,
  fk_log_id VARCHAR(20) NOT NULL,
  fk_action_id VARCHAR(20) NOT NULL,
  action_type VARCHAR(50),
  status VARCHAR(20) NOT NULL,
  input JSON,
  output JSON,
  error TEXT,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  
  FOREIGN KEY (fk_log_id) REFERENCES nc_automation_logs(id) ON DELETE CASCADE
);

-- 定时任务表
CREATE TABLE nc_automation_schedules (
  id VARCHAR(20) PRIMARY KEY,
  fk_automation_id VARCHAR(20) NOT NULL UNIQUE,
  cron_expression VARCHAR(100),
  interval_minutes INT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  FOREIGN KEY (fk_automation_id) REFERENCES nc_automations(id) ON DELETE CASCADE
);
```

### 4.3 核心服务实现

#### AutomationService

```typescript
// services/automations.service.ts
@Injectable()
export class AutomationsService {
  constructor(
    private readonly appHooksService: AppHooksService,
    @Inject('JobsService') private readonly jobsService: IJobsService,
  ) {}

  async list(context: NcContext, params: { 
    baseId: string; 
    tableId?: string 
  }): Promise<Automation[]> {
    return Automation.list(context, params);
  }

  async create(
    context: NcContext,
    params: { baseId: string; data: CreateAutomationReq }
  ): Promise<Automation> {
    // 验证触发器配置
    this.validateTrigger(params.data.trigger);
    
    // 验证动作配置
    this.validateActions(params.data.actions);
    
    // 创建自动化
    const automation = await Automation.insert(context, params.data);
    
    // 如果是定时触发器，注册定时任务
    if (automation.trigger.type.startsWith('schedule.')) {
      await this.scheduleAutomation(context, automation);
    }
    
    // 发送事件
    this.appHooksService.emit(AppEvents.AUTOMATION_CREATE, {
      automation,
      context,
    });
    
    return automation;
  }

  async update(
    context: NcContext,
    id: string,
    data: UpdateAutomationReq
  ): Promise<Automation> {
    const automation = await Automation.get(context, id);
    if (!automation) {
      throw new NcError('Automation not found');
    }
    
    // 更新自动化
    const updated = await Automation.update(context, id, data);
    
    // 更新定时任务
    if (data.trigger?.type?.startsWith('schedule.')) {
      await this.rescheduleAutomation(context, updated);
    }
    
    return updated;
  }

  async delete(context: NcContext, id: string): Promise<boolean> {
    const automation = await Automation.get(context, id);
    if (!automation) {
      throw new NcError('Automation not found');
    }
    
    // 取消定时任务
    await this.unscheduleAutomation(context, id);
    
    // 删除自动化
    await Automation.delete(context, id);
    
    return true;
  }

  async test(
    context: NcContext,
    id: string,
    testData?: Record<string, any>
  ): Promise<AutomationLog> {
    const automation = await Automation.get(context, id);
    if (!automation) {
      throw new NcError('Automation not found');
    }
    
    // 执行测试
    return this.jobsService.add(JobTypes.ExecuteAutomation, {
      context,
      automationId: id,
      testMode: true,
      testData,
    });
  }

  async trigger(
    context: NcContext,
    id: string,
    recordId: string
  ): Promise<void> {
    const automation = await Automation.get(context, id);
    if (!automation || !automation.is_active) {
      throw new NcError('Automation not found or inactive');
    }
    
    await this.jobsService.add(JobTypes.ExecuteAutomation, {
      context,
      automationId: id,
      recordId,
      triggerType: 'manual',
    });
  }
}
```

#### AutomationExecutorService

```typescript
// services/automation-executor.service.ts
@Injectable()
export class AutomationExecutorService {
  private readonly logger = new Logger(AutomationExecutorService.name);

  constructor(
    private readonly dataService: DatasService,
    @Inject('JobsService') private readonly jobsService: IJobsService,
  ) {}

  async execute(
    context: NcContext,
    params: {
      automation: Automation;
      triggerData: Record<string, any>;
      testMode?: boolean;
    }
  ): Promise<AutomationLog> {
    const { automation, triggerData, testMode } = params;
    
    // 创建执行日志
    const log = await AutomationLog.insert(context, {
      fk_automation_id: automation.id,
      trigger_type: automation.trigger.type,
      trigger_data: triggerData,
      status: 'running',
      started_at: new Date().toISOString(),
    });

    try {
      // 验证触发条件
      if (automation.trigger.conditions) {
        const conditionMet = await this.evaluateConditions(
          context,
          automation.trigger.conditions,
          triggerData
        );
        if (!conditionMet) {
          await this.completeLog(context, log.id, 'skipped');
          return log;
        }
      }

      // 执行动作链
      await this.executeActions(context, {
        automation,
        actions: automation.actions,
        triggerData,
        log,
        testMode,
      });

      // 更新日志状态
      await this.completeLog(context, log.id, 'success');
      
      // 更新自动化统计
      await Automation.incrementRunCount(context, automation.id);

    } catch (error) {
      this.logger.error(`Automation execution failed: ${error.message}`);
      
      await this.completeLog(context, log.id, 'failed', error.message);
      await Automation.incrementErrorCount(context, automation.id);
      
      throw error;
    }

    return log;
  }

  private async executeActions(
    context: NcContext,
    params: {
      automation: Automation;
      actions: AutomationAction[];
      triggerData: Record<string, any>;
      log: AutomationLog;
      testMode?: boolean;
      variables?: Record<string, any>;
    }
  ): Promise<void> {
    const { actions, triggerData, log, testMode, variables = {} } = params;
    
    // 按顺序执行动作
    const sortedActions = [...actions].sort((a, b) => a.order - b.order);
    
    let currentVariables = { 
      ...variables, 
      trigger: triggerData,
      record: triggerData.record,
    };

    for (const action of sortedActions) {
      const actionLog = await AutomationActionLog.insert(context, {
        fk_log_id: log.id,
        fk_action_id: action.id,
        action_type: action.type,
        status: 'running',
        input: this.resolveVariables(action.config, currentVariables),
        started_at: new Date().toISOString(),
      });

      try {
        const result = await this.executeAction(context, {
          action,
          variables: currentVariables,
          testMode,
        });

        // 更新变量
        currentVariables = {
          ...currentVariables,
          [`action_${action.id}`]: result,
          lastResult: result,
        };

        await AutomationActionLog.update(context, actionLog.id, {
          status: 'success',
          output: result,
          completed_at: new Date().toISOString(),
        });

        // 处理条件分支
        if (action.type === 'flow.condition') {
          const nextActionId = result.conditionMet 
            ? action.true_branch_id 
            : action.false_branch_id;
          
          if (nextActionId) {
            const branchActions = actions.filter(a => 
              this.isInBranch(a, nextActionId, actions)
            );
            await this.executeActions(context, {
              ...params,
              actions: branchActions,
              variables: currentVariables,
            });
          }
          break; // 条件分支后不继续线性执行
        }

      } catch (error) {
        await AutomationActionLog.update(context, actionLog.id, {
          status: 'failed',
          error: error.message,
          completed_at: new Date().toISOString(),
        });

        if (action.on_error === 'stop') {
          throw error;
        }
        // 'continue' - 继续执行下一个动作
      }
    }
  }

  private async executeAction(
    context: NcContext,
    params: {
      action: AutomationAction;
      variables: Record<string, any>;
      testMode?: boolean;
    }
  ): Promise<any> {
    const { action, variables, testMode } = params;
    const config = this.resolveVariables(action.config, variables);

    switch (action.type) {
      case 'record.update':
        return this.executeRecordUpdate(context, config, testMode);
      
      case 'record.create':
        return this.executeRecordCreate(context, config, testMode);
      
      case 'notification.email':
        return this.executeEmailNotification(context, config, testMode);
      
      case 'notification.webhook':
        return this.executeWebhook(context, config, testMode);
      
      case 'flow.condition':
        return this.evaluateCondition(context, config, variables);
      
      case 'flow.delay':
        return this.executeDelay(config);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // ... 其他辅助方法
}
```

---

## 五、实施路线图

### Phase 1: 基础架构 (2-3 周)

**后端:**
- [ ] 创建数据库迁移脚本
- [ ] 实现 Automation Model
- [ ] 实现 AutomationAction Model
- [ ] 实现 AutomationLog Model
- [ ] 创建 AutomationsController
- [ ] 实现基础 CRUD Service

**前端:**
- [ ] 创建 useAutomation hook
- [ ] 实现 AutomationList 组件
- [ ] 实现基础 AutomationEditor

### Phase 2: 触发器系统 (2 周)

**后端:**
- [ ] 实现 AutomationTriggerService
- [ ] 集成到现有 HookHandlerService
- [ ] 实现定时触发器 (Cron)

**前端:**
- [ ] TriggerSelector 组件
- [ ] RecordTrigger 配置
- [ ] FieldChangeTrigger 配置
- [ ] ScheduleTrigger 配置

### Phase 3: 动作执行系统 (3 周)

**后端:**
- [ ] 实现 AutomationExecutorService
- [ ] 实现记录操作动作
- [ ] 实现通知动作
- [ ] 实现 Webhook 动作
- [ ] 实现条件分支

**前端:**
- [ ] ActionSelector 组件
- [ ] RecordAction 配置
- [ ] NotificationAction 配置
- [ ] WebhookAction 配置
- [ ] ConditionAction 配置

### Phase 4: 工作流可视化 (2 周)

**前端:**
- [ ] WorkflowCanvas (基于 reactflow)
- [ ] WorkflowNode 组件
- [ ] 拖拽添加节点
- [ ] 节点连接编辑

### Phase 5: 执行日志和调试 (1 周)

**后端:**
- [ ] 完善执行日志记录
- [ ] 实现测试模式

**前端:**
- [ ] AutomationLogs 组件
- [ ] 执行详情查看
- [ ] 错误调试面板

### Phase 6: 高级功能 (持续)

- [ ] 国产通知渠道 (飞书、钉钉、企业微信)
- [ ] 脚本动作
- [ ] 循环动作
- [ ] 自动化模板

---

## 六、与现有 Webhook 系统的关系

### 6.1 兼容策略

新的自动化系统将**扩展**而非**替换**现有 Webhook 系统:

1. **数据层面**: 现有 `nc_hooks` 表保持不变，新增 `nc_automations` 表
2. **API 层面**: 现有 Webhook API 保持兼容，新增 Automation API
3. **UI 层面**: 现有 Webhook UI 保留，新增 Automation UI 入口

### 6.2 迁移路径

```
现有 Webhook                    新 Automation
┌─────────────────┐            ┌─────────────────┐
│    nc_hooks     │───转换───▶│ nc_automations  │
│  (单触发器+URL) │            │  (触发器+动作链) │
└─────────────────┘            └─────────────────┘
```

提供迁移工具，将简单 Webhook 自动转换为等效的 Automation:
- Webhook URL → `notification.webhook` 动作
- Webhook 条件 → Trigger 条件

---

## 七、技术选型建议

### 7.1 前端

| 功能 | 推荐方案 | 说明 |
|------|----------|------|
| 工作流画布 | @xyflow/react | 成熟的 React 流程图库 |
| 状态管理 | React Context + useReducer | 与现有架构一致 |
| 表单处理 | react-hook-form | 复杂表单配置 |
| 拖拽 | @dnd-kit/core | 现代拖拽库 |
| 代码编辑 | Monaco Editor | 脚本编辑 |

### 7.2 后端

| 功能 | 推荐方案 | 说明 |
|------|----------|------|
| 任务队列 | Bull (现有) | 复用现有基础设施 |
| 定时任务 | Bull + cron-parser | 定时触发器 |
| 模板引擎 | Handlebars (现有) | 变量替换 |

---

## 八、总结

本设计方案提供了一个类似飞书多维表格自动化的完整解决方案，核心特点:

1. **可扩展的触发器系统**: 支持记录事件、字段变化、定时、Webhook 等多种触发方式
2. **灵活的动作链**: 支持串联多个动作，包括记录操作、通知、条件分支
3. **可视化工作流编辑器**: 基于 reactflow 的拖拽式编辑体验
4. **完善的执行日志**: 详细的执行记录和调试信息
5. **与现有系统兼容**: 扩展而非替换现有 Webhook 功能

建议从 Phase 1 开始逐步实施，每个阶段完成后进行测试和验证，确保系统稳定性。
